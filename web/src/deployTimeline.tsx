import { Space, Tag, Typography } from 'antd';
import React from 'react';
import { DeployRun } from './api.service';

const { Text } = Typography;

export type RunStatus = 'error' | 'running' | 'master-done' | 'done';

export const STATUS_META: Record<RunStatus, { badge: 'error' | 'success' | 'processing' | 'warning'; label: string }> = {
  error: { badge: 'error', label: 'error' },
  running: { badge: 'processing', label: 'running' },
  'master-done': { badge: 'warning', label: 'master done' },
  done: { badge: 'success', label: 'done' },
};

export const runStatus = (run: DeployRun): RunStatus => {
  if (run.stages.MASTER_ERROR || run.stages.SLAVE_ERROR) return 'error';
  if (run.stages.SLAVE_END) return 'done';
  if (run.stages.MASTER_END) return 'master-done';
  return 'running';
};

export const fmtDate = (s: string) => new Date(s).toLocaleString();
export const fmtTime = (s: string) => new Date(s).toLocaleTimeString();
// date shown once from start, then bare times — a second full date is redundant even across midnight
export const fmtRange = (start: string, end: string) => `${fmtDate(start)} → ${fmtTime(end)}`;

export const MASTER_CHIPS = ['start', 'checkout', 'tech-stack', 'safe', 'env-created', 'push'];
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

export const buildTimelineItems = (
  run: DeployRun,
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

  push('master-start', 'green', 'master start', run.stages.MASTER_START?.eventDate);
  items.push({
    key: 'master-steps',
    color: 'gray',
    children: (
      <Space direction="vertical" size={4} style={{ marginTop: 2 }}>
        {schemaChips(masterSteps, MASTER_CHIPS.filter((c) => c !== 'push'), (c) => masterSteps.includes(c))}
        <div style={{ borderTop: `1px dashed ${borderColor}`, width: 'fit-content', minWidth: 180 }} />
        {schemaChips(masterSteps, BRANCH_CHIPS, (c) => masterSteps.includes(c))}
        <Space size={[4, 4]} wrap>
          <Tag color={run.stages.MASTER_END ? 'green' : 'default'} style={{ opacity: run.stages.MASTER_END ? 1 : 0.55 }}>
            push
          </Tag>
        </Space>
      </Space>
    ),
  });
  if (run.stages.MASTER_END) {
    push('master-end', 'green', 'master end — pushed to slave repo', run.stages.MASTER_END.eventDate);
  } else if (run.stages.MASTER_ERROR) {
    push('master-error', 'red', 'master error', run.stages.MASTER_ERROR.eventDate, (
      <Text type="secondary">last passed step: {masterSteps[masterSteps.length - 1] || '—'}</Text>
    ));
  } else {
    items.push({ key: 'master-open', color: 'gray', children: <Text type="secondary">master running…</Text> });
  }

  if (run.stages.SLAVE_START || run.stages.SLAVE_END || run.stages.SLAVE_ERROR) {
    push('slave-start', 'blue', 'slave start', run.stages.SLAVE_START?.eventDate);
    items.push({
      key: 'slave-steps',
      color: 'gray',
      children: schemaChips(
        slaveSteps,
        ['checkout', ...(slaveSteps.length ? slaveSteps : ['build', 'deploy']).filter((c) => c !== 'checkout')],
        (c) => slaveSteps.includes(c)
      ),
    });
    if (run.stages.SLAVE_END) {
      push('slave-end', 'green', 'slave end — deployed', run.stages.SLAVE_END.eventDate);
    } else if (run.stages.SLAVE_ERROR) {
      push('slave-error', 'red', 'slave error', run.stages.SLAVE_ERROR.eventDate, (
        <Text type="secondary">last passed step: {slaveSteps[slaveSteps.length - 1] || '—'}</Text>
      ));
    } else {
      items.push({ key: 'slave-open', color: 'gray', children: <Text type="secondary">slave running…</Text> });
    }
  } else if (run.stages.MASTER_END) {
    items.push({
      key: 'no-slave',
      color: 'gray',
      children: <Text type="secondary">no slave workflow — platform deploys on push</Text>,
    });
  }

  const hosting = HOSTING_BY_BRANCH[BRANCH_CHIPS.find((c) => masterSteps.includes(c)) ?? ''];
  const live = !!run.stages.SLAVE_END || (!!run.stages.MASTER_END && !slaveWorkflowGenerated);
  const failed = !!run.stages.MASTER_ERROR || !!run.stages.SLAVE_ERROR;
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
