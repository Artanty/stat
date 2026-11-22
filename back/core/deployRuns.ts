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

export const DEPLOY_STAGES = ['MASTER_START', 'MASTER_END', 'MASTER_ERROR', 'SLAVE_START', 'SLAVE_END', 'SLAVE_ERROR'] as const;
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
  startDate: string;
  endDate: string;
  hasError: boolean;
  retriggered: boolean;
  retriggeredAt: string | null;
  stages: Partial<Record<DeployStage, DeployEventDto>>;
  events: DeployEventDto[];
  attempts: DeployAttemptDto[];
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

// fetch deploy events and group them by workflowRunId into run objects (master/slave stages map),
// newest run first — the query logic shared by POST /get-deploy-runs and the mini envelope
export async function fetchDeployRuns(pool: Pool, query: GetDeployRunsQuery = {}): Promise<DeployRunDto[]> {
  const { projectId, workflowRunId, dateRange, limit } = query;

  const conditions: string[] = ['workflowRunId IS NOT NULL'];
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
  const sql = `SELECT id, projectId, namespace, stage, isError, eventData, eventDate, workflow, workflowRunId, commitMessage, steps
    FROM events WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?`;

  const [rows] = await pool.query(sql, queryParams);
  const dbRows = rows as (EventRow & { workflow: string | null; workflowRunId: string; commitMessage: string | null; steps: string | null })[];

  const byRun = new Map<string, DeployEventDto[]>();
  for (const row of dbRows) {
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
    };
    const list = byRun.get(row.workflowRunId) || [];
    list.unshift(dto); // rows are newest-first; unshift keeps chronological order per run
    byRun.set(row.workflowRunId, list);
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
      const first = events[0];
      const last = events[events.length - 1];
      // run-level fields reflect the LATEST attempt (current state); endDate keeps
      // the last activity for the ordering
      const latest = attempts[attempts.length - 1];
      // RETRIGGER is run-level metadata posted by flow's /retrigger (NOT a workflow
      // stage): latest occurrence wins
      const retriggerEvts = events.filter((e) => e.stage === 'RETRIGGER');
      const retriggeredAt = retriggerEvts.length ? retriggerEvts[retriggerEvts.length - 1].eventDate : null;
      return {
        workflowRunId: runId,
        projectId: first.projectId,
        namespace: first.namespace,
        commitMessage: events.map((e) => e.commitMessage).find((v) => v) || null,
        tag: events.map((e) => e.eventData).find((v) => v) || '',
        startDate: latest.startDate,
        endDate: last.eventDate,
        hasError: latest.hasError,
        retriggered: retriggeredAt !== null,
        retriggeredAt,
        stages: latest.stages,
        events,
        attempts,
      };
    })
    // sort by last activity (endDate), not startDate — a re-run adds events to the SAME
    // run id (startDate stays the original attempt's), but its rerun events make it the
    // most recent activity, so it must surface as the latest run
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))
    .slice(0, limit || 50);
}
