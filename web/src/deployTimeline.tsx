import { Space, Tag, Typography } from 'antd';
import React from 'react';
import { DeployEvent, DeployRun, DeployStage } from './api.service';

const { Text } = Typography;

export type RunStatus = 'error' | 'running' | 'master-done' | 'done';

export const STATUS_META: Record<RunStatus, { badge: 'error' | 'success' | 'processing' | 'warning'; label: string }> = {
  error: { badge: 'error', label: 'error' },
  running: { badge: 'processing', label: 'running' },
  // master finished without slave events = still a successful deploy (e.g. master-only run / slave telemetry missing)
  'master-done': { badge: 'success', label: 'done' },
  done: { badge: 'success', label: 'done' },
};

export const runStatus = (run: DeployRun): RunStatus => {
  if (run.stages.FLOW_ERROR || run.stages.MASTER_ERROR || run.stages.SLAVE_ERROR) return 'error';
  if (run.stages.SLAVE_END) return 'done';
  if (run.stages.MASTER_END) return 'master-done';
  return 'running';
};

export const fmtDate = (s: string) => new Date(s).toLocaleString();
export const fmtTime = (s: string) => new Date(s).toLocaleTimeString();
// date shown once from start, then bare times — a second full date is redundant even across midnight
export const fmtRange = (start: string, end: string) => `${fmtDate(start)} → ${fmtTime(end)}`;

export const MASTER_CHIPS = ['start', 'checkout', 'tech-stack', 'safe', 'env-created', 'push'];
// flow (webhook service) step tags, in the order flow passes them (src/runContext wiring)
export const FLOW_CHIPS = ['webhook-received', 'signature-verified', 'tag-parsed', 'prev-tag-resolved', 'namespaces-resolved', 'safe-version', 'dispatch'];
export const BRANCH_CHIPS = ['vercel-json', 'render-yaml', 'ftp-workflow', 'vh-workflow', 'vds-workflow'];
export const SLAVE_WORKFLOW_MARKS = ['ftp-workflow', 'vh-workflow', 'vds-workflow'];
export const HOSTING_BY_BRANCH: Record<string, { name: string; color: string }> = {
  'vercel-json': { name: 'vercel', color: 'default' },
  'render-yaml': { name: 'render', color: 'blue' },
  'ftp-workflow': { name: 'ftp', color: 'orange' },
  'vh-workflow': { name: 'timeweb vh', color: 'green' },
  'vds-workflow': { name: 'vds', color: 'purple' },
};

export interface TimelineItem {
  key: string;
  color: string;
  label?: React.ReactNode;
  children: React.ReactNode;
}

// full chip row: every possible step, lit if taken in this run
export const schemaChips = (steps: string[], chips: string[], lit: (c: string) => boolean) => (
  <Space size={[4, 4]} wrap>
    {chips.map((c) => (
      <Tag key={c} color={lit(c) ? 'green' : 'default'} style={{ opacity: lit(c) ? 1 : 0.55 }}>
        {c}
      </Tag>
    ))}
  </Space>
);

// master action lives in the serf repo — link to the workflow file that ran.
// workflowRef = owner/repo/.github/workflows/<file>@<ref> (sent by the master since api v2;
// older events carry none = deploy.yml, api v1).
export const SERF_ACTIONS_URL = 'https://github.com/Artanty/serf/actions';
export const serfWorkflow = (ev?: DeployEvent): { url: string; label: string } => {
  const api = ev?.apiVersion || '1';
  const ref = ev?.workflowRef || '';
  const [path] = ref.split('@');
  const file = path.split('/').pop() || 'deploy.yml';
  const url = ref
    ? `https://github.com/${path.slice(0, -file.length - 1)}/actions/workflows/${file}`
    : SERF_ACTIONS_URL;
  return { url, label: `api v${api} · ${file}` };
};

// stages of ONE attempt (not the whole merged run) — pass run.stages or attempt.stages
export const buildTimelineItems = (
  stages: Partial<Record<DeployStage, DeployEvent>>,
  masterSteps: string[],
  slaveSteps: string[],
  borderColor: string
): TimelineItem[] => {
  const items: TimelineItem[] = [];
  const push = (key: string, color: string, title: string, time?: string, extra?: React.ReactNode) => {
    items.push({
      key,
      color,
      label: time ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {fmtTime(time)}
        </Text>
      ) : undefined,
      children: (
        <Space direction="vertical" size={2}>
          <Text strong={color === 'red'} style={color === 'red' ? { color: '#ff4d4f' } : undefined}>
            {title}
          </Text>
          {extra}
        </Space>
      ),
    });
  };

  const slaveWorkflowGenerated = SLAVE_WORKFLOW_MARKS.some((m) => masterSteps.includes(m));

  // flow (webhook service) — FIRST in the timeline, like the master action step.
  // Present from FLOW_START (before the GitHub Action exists) on; steps from the
  // freshest terminal event, falling back to START's prelude while running.
  if (stages.FLOW_START) {
    const flowSteps = stages.FLOW_END?.steps ?? stages.FLOW_ERROR?.steps ?? stages.FLOW_START.steps;
    push('flow-start', 'blue', 'flow — webhook', stages.FLOW_START.eventDate, (
      <Text type="secondary">github webhook → serf dispatch</Text>
    ));
    items.push({
      key: 'flow-steps',
      color: 'gray',
      children: schemaChips(flowSteps, FLOW_CHIPS, (c) => flowSteps.includes(c)),
    });
    if (stages.FLOW_END) {
      push('flow-end', 'blue', 'flow end — dispatched', stages.FLOW_END.eventDate);
    } else if (stages.FLOW_ERROR) {
      push('flow-error', 'red', 'flow error', stages.FLOW_ERROR.eventDate, (
        <Text type="secondary">last passed step: {flowSteps[flowSteps.length - 1] || '—'}</Text>
      ));
    } else {
      items.push({ key: 'flow-open', color: 'gray', children: <Text type="secondary">flow running…</Text> });
    }
    // flow-only run: the serf action never started (dispatch failed / never reached)
    if (!stages.MASTER_START) {
      items.push({
        key: 'no-master',
        color: stages.FLOW_ERROR ? 'red' : 'gray',
        children: <Text type="secondary">github action not started</Text>,
      });
      return items;
    }
  }

  // master action lives in the serf repo — link straight to its workflow file
  const serf = serfWorkflow(stages.MASTER_START);
  push('master-start', 'green', 'master start', stages.MASTER_START?.eventDate, (
    <a href={serf.url} target="_blank" rel="noreferrer">
      {serf.label} ↗
    </a>
  ));
  items.push({
    key: 'master-steps',
    color: 'gray',
    children: (
      <Space direction="vertical" size={4} style={{ marginTop: 2 }}>
        {schemaChips(masterSteps, MASTER_CHIPS.filter((c) => c !== 'push'), (c) => masterSteps.includes(c))}
        <div style={{ borderTop: `1px dashed ${borderColor}`, width: 'fit-content', minWidth: 180 }} />
        {schemaChips(masterSteps, BRANCH_CHIPS, (c) => masterSteps.includes(c))}
        <Space size={[4, 4]} wrap>
          <Tag color={stages.MASTER_END ? 'green' : 'default'} style={{ opacity: stages.MASTER_END ? 1 : 0.55 }}>
            push
          </Tag>
        </Space>
      </Space>
    ),
  });
  if (stages.MASTER_END) {
    push('master-end', 'green', 'master end — pushed to slave repo', stages.MASTER_END.eventDate);
  } else if (stages.MASTER_ERROR) {
    push('master-error', 'red', 'master error', stages.MASTER_ERROR.eventDate, (
      <Text type="secondary">last passed step: {masterSteps[masterSteps.length - 1] || '—'}</Text>
    ));
  } else {
    items.push({ key: 'master-open', color: 'gray', children: <Text type="secondary">master running…</Text> });
  }

  if (stages.SLAVE_START || stages.SLAVE_END || stages.SLAVE_ERROR) {
    push('slave-start', 'blue', 'slave start', stages.SLAVE_START?.eventDate);
    items.push({
      key: 'slave-steps',
      color: 'gray',
      children: schemaChips(
        slaveSteps,
        ['checkout', ...(slaveSteps.length ? slaveSteps : ['build', 'deploy']).filter((c) => c !== 'checkout')],
        (c) => slaveSteps.includes(c)
      ),
    });
    if (stages.SLAVE_END) {
      push('slave-end', 'green', 'slave end — deployed', stages.SLAVE_END.eventDate);
    } else if (stages.SLAVE_ERROR) {
      push('slave-error', 'red', 'slave error', stages.SLAVE_ERROR.eventDate, (
        <Text type="secondary">last passed step: {slaveSteps[slaveSteps.length - 1] || '—'}</Text>
      ));
    } else {
      items.push({ key: 'slave-open', color: 'gray', children: <Text type="secondary">slave running…</Text> });
    }
  } else if (stages.MASTER_END) {
    items.push({
      key: 'no-slave',
      color: 'gray',
      children: <Text type="secondary">no slave workflow — platform deploys on push</Text>,
    });
  }

  const hosting = HOSTING_BY_BRANCH[BRANCH_CHIPS.find((c) => masterSteps.includes(c)) ?? ''];
  const live = !!stages.SLAVE_END || (!!stages.MASTER_END && !slaveWorkflowGenerated);
  const failed = !!stages.MASTER_ERROR || !!stages.SLAVE_ERROR;
  if (hosting) {
    items.push({
      key: 'hosting',
      color: failed ? 'red' : live ? 'green' : 'gray',
      children: (
        <Space size={6}>
          <Text type="secondary">hosting:</Text>
          <Tag
            color={failed ? 'error' : live ? hosting.color : 'default'}
            style={{ marginInlineEnd: 0, opacity: live || failed ? 1 : 0.55 }}
          >
            {hosting.name}
          </Tag>
        </Space>
      ),
    });
  }
  return items;
};
