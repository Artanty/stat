import type { Pool } from 'mysql2/promise';

export interface EventRow {
  id: number;
  projectId: string;
  namespace: string;
  stage: string;
  isError: number;
  eventData: string;
  eventDate: string;
  [key: string]: unknown;
}

export const DEPLOY_STAGES = ['FLOW_START', 'FLOW_END', 'FLOW_ERROR', 'MASTER_START', 'MASTER_END', 'MASTER_ERROR', 'SLAVE_START', 'SLAVE_END', 'SLAVE_ERROR'] as const;
export type DeployStage = (typeof DEPLOY_STAGES)[number];

export interface DeployEventDto {
  id: number;
  projectId: string;
  namespace: string;
  stage: string;
  workflow: string | null;
  isError: number;
  eventData: string;
  eventDate: string;
  steps: string[];
  commitMessage: string | null;
  workflowRef: string | null;
  apiVersion: string | null;
  runUrl: string | null;
  error: string | null;
}

// one execution attempt of a run — a retriggered run re-runs the whole workflow
// under the SAME workflowRunId, so every MASTER_START after the first opens a new attempt
export interface DeployAttemptDto {
  startDate: string;
  endDate: string;
  hasError: boolean;
  stages: Partial<Record<DeployStage, DeployEventDto>>;
  events: DeployEventDto[];
}

export interface DeployRunDto {
  workflowRunId: string;
  projectId: string;
  namespace: string;
  commitMessage: string | null;
  tag: string;
  // serf workflow file the master ran, e.g. owner/serf/.github/workflows/deploy_v2.yml@refs/heads/master
  workflowRef: string | null;
  workflowFile: string;
  apiVersion: string;
  // direct link to the serf master workflow run (…/actions/runs/<id>), sent since api v3
  runUrl: string | null;
  startDate: string;
  endDate: string;
  hasError: boolean;
  retriggered: boolean;
  retriggeredAt: string | null;
  stages: Partial<Record<DeployStage, DeployEventDto>>;
  events: DeployEventDto[];
  attempts: DeployAttemptDto[];
  // true when the run exists only from flow (webhook) telemetry: the GitHub Action
  // never started, so there is no real workflowRunId and nothing to retrigger
  flowOnly: boolean;
}

export interface GetDeployRunsQuery {
  projectId?: string;
  workflowRunId?: string;
  dateRange?: { startDate?: string; endDate?: string };
  limit?: number;
}

// steps arrive as a JSON array string ('["start","checkout"]') from the workflows
export function parseSteps(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw === '') return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// flow (webhook) telemetry: FLOW_* events arrive with NO workflowRunId — they are sent
// before the GitHub Action exists. They are grouped per (projectId, namespace) — a
// FLOW_START opens a group — and merged at read time into the earliest subsequent run
// of the same project+namespace (event ids are monotonic, so "subsequent" = the run
// whose first real event id is greater than the group's last id). Groups with no
// subsequent run become provisional flow-only runs (no run id, nothing to retrigger).
const FLOW_STAGES = ['FLOW_START', 'FLOW_END', 'FLOW_ERROR'] as const;

// flow's eventData is a JSON object; the run tag lives in its .tag (same value serf
// sends as the master's plain-string eventData — the git_tag workflow input)
function eventDataTag(event: DeployEventDto): string {
  if (!event.stage.startsWith('FLOW_')) return event.eventData;
  try {
    const parsed = JSON.parse(event.eventData) as { tag?: unknown };
    return parsed.tag == null ? '' : String(parsed.tag);
  } catch {
    return event.eventData;
  }
}

// fetch deploy events and group them by workflowRunId into run objects (master/slave stages map),
// newest run first — the query logic shared by POST /get-deploy-runs and the mini envelope
export async function fetchDeployRuns(pool: Pool, query: GetDeployRunsQuery = {}): Promise<DeployRunDto[]> {
  const { projectId, workflowRunId, dateRange, limit } = query;

  const conditions: string[] = [`(workflowRunId IS NOT NULL OR stage IN (${FLOW_STAGES.map((s) => `'${s}'`).join(',')}))`];
  const queryParams: (string | number)[] = [];
  if (projectId) {
    conditions.push('projectId = ?');
    queryParams.push(projectId);
  }
  if (workflowRunId) {
    conditions.push('workflowRunId = ?');
    queryParams.push(workflowRunId);
  }
  if (dateRange?.startDate) {
    conditions.push('eventDate >= ?');
    queryParams.push(dateRange.startDate);
  }
  if (dateRange?.endDate) {
    conditions.push('eventDate <= ?');
    queryParams.push(dateRange.endDate);
  }
  // a run has up to ~6 events; fetch a window, group, then trim to the run limit
  queryParams.push(Math.max((limit || 50) * 8, 100));
  const sql = `SELECT id, projectId, namespace, stage, isError, eventData, eventDate, workflow, workflowRunId, commitMessage, steps, workflowRef, apiVersion, runUrl, error
    FROM events WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?`;

  const [rows] = await pool.query(sql, queryParams);
  const dbRows = rows as (EventRow & {
    workflow: string | null;
    workflowRunId: string | null;
    commitMessage: string | null;
    steps: string | null;
    workflowRef: string | null;
    apiVersion: string | null;
    runUrl: string | null;
    error: string | null;
  })[];

  const byRun = new Map<string, DeployEventDto[]>();
  const flowGroups = new Map<string, DeployEventDto[][]>(); // `${projectId}\t${namespace}` → chronological groups
  // rows are newest-first; walk chronologically so flow groups assemble in order and
  // run event lists end up chronological via plain push
  for (const row of [...dbRows].reverse()) {
    const dto: DeployEventDto = {
      id: row.id,
      projectId: row.projectId,
      namespace: row.namespace,
      stage: row.stage,
      workflow: row.workflow,
      isError: row.isError,
      eventData: row.eventData,
      eventDate: row.eventDate,
      steps: parseSteps(row.steps),
      commitMessage: row.commitMessage,
      workflowRef: row.workflowRef,
      apiVersion: row.apiVersion,
      runUrl: row.runUrl ?? null,
      error: row.error ?? null,
    };
    if (row.workflowRunId) {
      const list = byRun.get(row.workflowRunId) || [];
      list.push(dto);
      byRun.set(row.workflowRunId, list);
    } else {
      const key = `${row.projectId}\t${row.namespace}`;
      const groups = flowGroups.get(key) || [];
      const current = groups[groups.length - 1];
      if (row.stage === 'FLOW_START' || !current) {
        groups.push([dto]);
      } else {
        current.push(dto);
      }
      flowGroups.set(key, groups);
    }
  }

  // first real event id per run, captured BEFORE any prepends — the merge target
  // must keep matching on the run's own first event, not on an attached flow group
  const firstRealId = new Map<string, number>();
  for (const [runId, events] of byRun) {
    firstRealId.set(runId, events[0].id);
  }

  const flowOnlyRunIds = new Set<string>();
  const prependToRun = new Map<string, DeployEventDto[][]>(); // runId → groups, chronological
  for (const [key, groups] of flowGroups) {
    const [flowProjectId, flowNamespace] = key.split('\t');
    for (const group of groups) {
      const lastId = group[group.length - 1].id;
      const targetRunId = [...firstRealId.entries()]
        .filter(([runId, firstId]) => {
          const events = byRun.get(runId)!;
          return events[0].projectId === flowProjectId
            && events[0].namespace === flowNamespace
            && firstId > lastId;
        })
        .sort((a, b) => (a[1] < b[1] ? -1 : 1))[0]?.[0];
      if (targetRunId) {
        const queue = prependToRun.get(targetRunId) || [];
        queue.push(group);
        prependToRun.set(targetRunId, queue);
      } else {
        const provisionalId = `flow:${group[0].id}`;
        byRun.set(provisionalId, group);
        flowOnlyRunIds.add(provisionalId);
      }
    }
  }
  for (const [runId, groups] of prependToRun) {
    byRun.get(runId)!.unshift(...groups.flat());
  }

  return [...byRun.entries()]
    .map(([runId, events]) => {
      // split chronological events into attempts: a MASTER_START opens a new attempt
      // only when the current one already has one (the first event starts attempt 1);
      // RETRIGGER markers land between attempts and are run-level metadata only
      const attempts: DeployAttemptDto[] = [];
      let stages: DeployRunDto['stages'] = {};
      for (const e of events) {
        if (attempts.length === 0 || (e.stage === 'MASTER_START' && stages.MASTER_START)) {
          stages = {};
          attempts.push({ startDate: e.eventDate, endDate: e.eventDate, hasError: false, stages, events: [] });
        }
        if ((DEPLOY_STAGES as readonly string[]).includes(e.stage)) {
          const stage = e.stage as DeployStage;
          if (!stages[stage]) stages[stage] = e;
        }
        const attempt = attempts[attempts.length - 1];
        attempt.events.push(e);
        attempt.hasError = attempt.hasError || e.isError === 1;
        attempt.endDate = e.eventDate;
      }
      // deferred-flow recovery: a FLOW_ERROR followed by a LATER FLOW_END in the
      // same attempt is the noy wake-and-callback path (error → deferred → resume
      // → dispatched) — the run must not stay red once the deferred dispatch landed
      for (const att of attempts) {
        const flowErr = att.stages.FLOW_ERROR;
        if (flowErr && att.events.some((e) => e.stage === 'FLOW_END' && e.id > flowErr.id)) {
          delete att.stages.FLOW_ERROR;
          att.hasError = att.events.some((e) => e.isError === 1 && e.stage !== 'FLOW_ERROR');
        }
      }
      const first = events[0];
      const last = events[events.length - 1];
      // run-level fields reflect the LATEST attempt (current state); endDate keeps
      // the last activity for the ordering
      const latest = attempts[attempts.length - 1];
      // RETRIGGER is run-level metadata posted by flow's /retrigger (NOT a workflow
      // stage): latest occurrence wins
      const retriggerEvts = events.filter((e) => e.stage === 'RETRIGGER');
      const retriggeredAt = retriggerEvts.length ? retriggerEvts[retriggerEvts.length - 1].eventDate : null;
      // workflow file + api version come from the master events only
      const workflowRef = events.map((e) => e.workflowRef).find((v) => v) || null;
      // file name without the @ref suffix: …/.github/workflows/deploy_v2.yml@refs/heads/master
      const workflowFile = workflowRef ? workflowRef.split('@')[0].split('/').pop() as string : '';
      // events predating the field were sent by deploy.yml = api v1
      const apiVersion = events.map((e) => e.apiVersion).find((v) => v) || '1';
      const runUrl = events.map((e) => e.runUrl).find((v) => v) || null;
      return {
        workflowRunId: runId,
        projectId: first.projectId,
        namespace: first.namespace,
        commitMessage: events.map((e) => e.commitMessage).find((v) => v) || null,
        tag: events.map(eventDataTag).find((v) => v) || '',
        workflowRef,
        workflowFile,
        apiVersion,
        runUrl,
        startDate: latest.startDate,
        endDate: last.eventDate,
        hasError: latest.hasError,
        retriggered: retriggeredAt !== null,
        retriggeredAt,
        stages: latest.stages,
        events,
        attempts,
        flowOnly: flowOnlyRunIds.has(runId),
      };
    })
    // sort by last activity (endDate), not startDate — a re-run adds events to the SAME
    // run id (startDate stays the original attempt's), but its rerun events make it the
    // most recent activity, so it must surface as the latest run
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))
    .slice(0, limit || 50);
}
