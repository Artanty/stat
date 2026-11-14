import { Badge, Button, Col, Empty, Input, List, Row, Segmented, Space, Tag, Timeline, Typography } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { DeployRun, getDeployRuns } from '../api.service';
import { useTheme } from '../theme';

const { Text, Title } = Typography;

type RunStatus = 'error' | 'running' | 'master-done' | 'done';

const STATUS_META: Record<RunStatus, { badge: 'error' | 'success' | 'processing' | 'warning'; label: string }> = {
  error: { badge: 'error', label: 'error' },
  running: { badge: 'processing', label: 'running' },
  'master-done': { badge: 'warning', label: 'master done' },
  done: { badge: 'success', label: 'done' },
};

const runStatus = (run: DeployRun): RunStatus => {
  if (run.stages.MASTER_ERROR || run.stages.SLAVE_ERROR) return 'error';
  if (run.stages.SLAVE_END) return 'done';
  if (run.stages.MASTER_END) return 'master-done';
  return 'running';
};

const fmtDate = (s: string) => new Date(s).toLocaleString();

const stepsTags = (steps: string[]) => (
  <Space size={[4, 4]} wrap>
    {steps.map((s, i) => (
      <Tag key={`${s}-${i}`} color="green">{s}</Tag>
    ))}
  </Space>
);

const MASTER_CHIPS = ['start', 'checkout', 'tech-stack', 'safe', 'env-created', 'push'];
const BRANCH_CHIPS = ['vercel-json', 'render-yaml', 'ftp-workflow', 'vh-workflow', 'vds-workflow'];
const SLAVE_WORKFLOW_MARKS = ['ftp-workflow', 'vh-workflow', 'vds-workflow'];

type NodeState = 'lit' | 'dim' | 'error';

const SchemaNode: React.FC<{ title: string; state: NodeState; children?: React.ReactNode }> = ({ title, state, children }) => {
  const { colors } = useTheme();
  return (
    <div
      style={{
        minWidth: 112,
        maxWidth: 190,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${state === 'error' ? '#ff4d4f' : state === 'lit' ? '#52c41a' : colors.border}`,
        background: colors.surface,
        opacity: state === 'dim' ? 0.45 : 1,
      }}
    >
      <div style={{ fontWeight: 600, color: state === 'error' ? '#ff4d4f' : colors.text, marginBottom: 6 }}>{title}</div>
      <Space direction="vertical" size={4}>
        {children}
      </Space>
    </div>
  );
};

const Chip: React.FC<{ label: string; lit: boolean }> = ({ label, lit }) => {
  const { colors } = useTheme();
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 10,
        fontSize: 12,
        width: 'fit-content',
        border: `1px solid ${lit ? '#52c41a' : colors.border}`,
        color: lit ? '#52c41a' : colors.muted,
        background: lit ? 'rgba(82,196,26,0.08)' : 'transparent',
      }}
    >
      {label}
    </span>
  );
};

const Arrow: React.FC = () => {
  const { colors } = useTheme();
  return (
    <span style={{ color: colors.muted, fontSize: 16, alignSelf: 'center' }}>→</span>
  );
};

interface ProjectRowProps {
  title: string;
  count: number;
  badge: 'error' | 'success' | 'processing' | 'warning' | 'default';
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ title, count, badge, selected, dimmed, onSelect, onHide, onUnhide }) => {
  const { colors } = useTheme();
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        marginBottom: 4,
        borderRadius: 6,
        cursor: 'pointer',
        border: `1px solid ${selected ? '#1677ff' : colors.border}`,
        background: colors.surface,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <Badge status={badge} />
      <Text strong={selected} ellipsis style={{ flex: 1, minWidth: 0 }}>{title}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>{count}</Text>
      {onHide && (
        <EyeInvisibleOutlined
          onClick={(e) => { e.stopPropagation(); onHide(); }}
          style={{ color: colors.muted }}
        />
      )}
      {onUnhide && (
        <EyeOutlined
          onClick={(e) => { e.stopPropagation(); onUnhide(); }}
          style={{ color: colors.muted }}
        />
      )}
    </div>
  );
};

export const DeployTab: React.FC = () => {
  const { colors } = useTheme();
  const [runs, setRuns] = useState<DeployRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<string>(() => localStorage.getItem('deployTabProject') || 'all');
  const [view, setView] = useState<'sequence' | 'schema'>(
    () => (localStorage.getItem('deployTabView') as 'sequence' | 'schema') || 'sequence'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('deployTabHiddenProjects') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });

  const persistHidden = (next: string[]) => {
    setHidden(next);
    localStorage.setItem('deployTabHiddenProjects', JSON.stringify(next));
  };

  const hideProject = (projectId: string) => {
    persistHidden(Array.from(new Set([...hidden, projectId])));
    if (project === projectId) setProject('all');
  };

  const unhideProject = (projectId: string) => {
    persistHidden(hidden.filter((p) => p !== projectId));
  };

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await getDeployRuns({ limit: 50 });
      setRuns(data);
    } catch (e: any) {
      console.log(e.message);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('deployTabProject', project);
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sorted by name, with run count and last-run status, derived from the fetched runs
  const projects = useMemo(() => {
    const map = new Map<string, { count: number; lastRun: DeployRun }>();
    for (const r of runs) {
      const cur = map.get(r.projectId);
      if (!cur) {
        map.set(r.projectId, { count: 1, lastRun: r });
      } else {
        cur.count += 1;
        if (r.startDate > cur.lastRun.startDate) cur.lastRun = r;
      }
    }
    return Array.from(map.entries())
      .map(([projectId, v]) => ({ projectId, ...v }))
      .sort((a, b) => a.projectId.localeCompare(b.projectId));
  }, [runs]);

  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) => (showHidden || !hidden.includes(p.projectId)) && (!q || p.projectId.toLowerCase().includes(q))
    );
  }, [projects, search, hidden, showHidden]);

  // runs of hidden projects stay out of 'all' regardless of the selected project
  const allVisibleCount = useMemo(
    () => runs.filter((r) => showHidden || !hidden.includes(r.projectId)).length,
    [runs, hidden, showHidden]
  );

  const newestVisibleRun = useMemo(
    () => runs.find((r) => showHidden || !hidden.includes(r.projectId)),
    [runs, hidden, showHidden]
  );

  const visibleRuns = useMemo(
    () => runs.filter(
      (r) => (project === 'all' || r.projectId === project) && (showHidden || !hidden.includes(r.projectId))
    ),
    [runs, project, hidden, showHidden]
  );

  // a persisted selection from an older session may not exist in the loaded runs — fall back
  useEffect(() => {
    if (project !== 'all' && runs.length > 0 && !runs.some((r) => r.projectId === project)) {
      setProject('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  // keep the selected run inside the filtered list
  useEffect(() => {
    if (!visibleRuns.some((r) => r.workflowRunId === selectedId)) {
      setSelectedId(visibleRuns[0]?.workflowRunId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRuns]);

  const run = useMemo(() => runs.find((r) => r.workflowRunId === selectedId) ?? null, [runs, selectedId]);

  const masterSteps = run?.stages.MASTER_END?.steps ?? run?.stages.MASTER_ERROR?.steps ?? [];
  const slaveSteps = run?.stages.SLAVE_END?.steps ?? run?.stages.SLAVE_ERROR?.steps ?? [];
  const slaveWorkflowGenerated = SLAVE_WORKFLOW_MARKS.some((m) => masterSteps.includes(m));

  const timelineItems = useMemo(() => {
    if (!run) return [];
    const items: { key: string; color: string; label?: React.ReactNode; children: React.ReactNode }[] = [];
    const push = (key: string, color: string, title: string, time?: string, extra?: React.ReactNode) => {
      items.push({
        key,
        color,
        label: time ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fmtDate(time)}
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

    push('master-start', 'green', 'master start', run.stages.MASTER_START?.eventDate);
    if (masterSteps.length) {
      items.push({ key: 'master-steps', color: 'gray', children: stepsTags(masterSteps) });
    }
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
      if (slaveSteps.length) {
        items.push({ key: 'slave-steps', color: 'gray', children: stepsTags(slaveSteps) });
      }
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
    return items;
  }, [run, masterSteps, slaveSteps]);

  const hideBtn = (
    <Button
      size="small"
      block
      icon={showHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      onClick={() => setShowHidden((v) => !v)}
    >
      {showHidden ? 'hide hidden' : `show hidden (${hidden.length})`}
    </Button>
  );

  return (
    <div style={{ background: colors.background, minHeight: '100%' }}>
      <Row gutter={16}>
        <Col span={5}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Input
              allowClear
              placeholder="search project"
              prefix={<SearchOutlined style={{ color: colors.muted }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {hidden.length > 0 && hideBtn}
            <div style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <ProjectRow
                title="all projects"
                count={allVisibleCount}
                badge={newestVisibleRun ? STATUS_META[runStatus(newestVisibleRun)].badge : 'default'}
                selected={project === 'all'}
                onSelect={() => setProject('all')}
              />
              {visibleProjects.map((p) => {
                const isHidden = hidden.includes(p.projectId);
                return (
                  <ProjectRow
                    key={p.projectId}
                    title={p.projectId}
                    count={p.count}
                    badge={STATUS_META[runStatus(p.lastRun)].badge}
                    selected={project === p.projectId}
                    dimmed={isHidden}
                    onSelect={() => setProject(p.projectId)}
                    onHide={isHidden ? undefined : () => hideProject(p.projectId)}
                    onUnhide={isHidden ? () => unhideProject(p.projectId) : undefined}
                  />
                );
              })}
              {visibleProjects.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>no projects match</Text>
              )}
            </div>
          </Space>
        </Col>
        <Col span={7}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">{visibleRuns.length} runs</Text>
              <Button size="small" loading={loading} onClick={() => loadRuns()}>
                reload
              </Button>
            </Space>
            <List
              size="small"
              loading={loading}
              dataSource={visibleRuns}
              locale={{ emptyText: <Empty description="no deploy runs" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(r) => {
                const meta = STATUS_META[runStatus(r)];
                const selected = r.workflowRunId === selectedId;
                return (
                  <div
                    key={r.workflowRunId}
                    onClick={() => setSelectedId(r.workflowRunId)}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 10px',
                      marginBottom: 6,
                      borderRadius: 8,
                      border: `1px solid ${selected ? '#1677ff' : colors.border}`,
                      background: colors.surface,
                    }}
                  >
                    <Space size={6} wrap>
                      <Badge status={meta.badge} text={meta.label} />
                      <Text strong>{r.projectId}</Text>
                      <Tag>{r.namespace}</Tag>
                      {r.tag && <Text type="secondary">v{r.tag}</Text>}
                    </Space>
                    <div
                      style={{
                        color: colors.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      {r.commitMessage || '—'}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {fmtDate(r.startDate)} · run {r.workflowRunId.slice(-6)}
                    </Text>
                  </div>
                );
              }}
            />
          </Space>
        </Col>
        <Col span={12}>
          {!run ? (
            <Empty description="select a run" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Space size={8} wrap>
                  <Title level={5} style={{ margin: 0 }}>
                    {run.projectId}
                  </Title>
                  <Tag>{run.namespace}</Tag>
                  {run.tag && <Tag color="blue">v{run.tag}</Tag>}
                  <Text code>run {run.workflowRunId}</Text>
                </Space>
                <div style={{ color: colors.text, marginTop: 4 }}>{run.commitMessage || '—'}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {fmtDate(run.startDate)} → {fmtDate(run.endDate)}
                </Text>
              </div>
              <Segmented
                value={view}
                onChange={(v) => {
                  setView(v as 'sequence' | 'schema');
                  localStorage.setItem('deployTabView', v as string);
                }}
                options={[
                  { label: 'sequence', value: 'sequence' },
                  { label: 'schema', value: 'schema' },
                ]}
              />
              {view === 'sequence' ? (
                <Timeline mode="left" items={timelineItems} />
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'stretch',
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}
                  >
                    <SchemaNode title="flow" state={run ? 'lit' : 'dim'}>
                      <Chip label="tag push" lit={!!run} />
                    </SchemaNode>
                    <Arrow />
                    <SchemaNode
                      title="serf master"
                      state={run.stages.MASTER_ERROR ? 'error' : run.stages.MASTER_START ? 'lit' : 'dim'}
                    >
                      {MASTER_CHIPS.filter((c) => c !== 'push').map((c) => (
                        <Chip key={c} label={c} lit={masterSteps.includes(c)} />
                      ))}
                      <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: 4, marginTop: 2 }}>
                        {BRANCH_CHIPS.map((c) => (
                          <Chip key={c} label={c} lit={masterSteps.includes(c)} />
                        ))}
                      </div>
                      <Chip label="push" lit={!!run.stages.MASTER_END} />
                    </SchemaNode>
                    <Arrow />
                    <SchemaNode title="slave repo" state={run.stages.MASTER_END ? 'lit' : 'dim'}>
                      <Chip label="push received" lit={!!run.stages.MASTER_END} />
                    </SchemaNode>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 18px', color: colors.muted }}>↓</div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'stretch',
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}
                  >
                    <SchemaNode
                      title="slave action"
                      state={run.stages.SLAVE_ERROR ? 'error' : run.stages.SLAVE_START ? 'lit' : 'dim'}
                    >
                      {slaveWorkflowGenerated || run.stages.SLAVE_START ? (
                        <>
                          <Chip label="checkout" lit={!!run.stages.SLAVE_START} />
                          {(slaveSteps.length ? slaveSteps : ['build', 'deploy']).map((c, i) => (
                            <Chip key={`${c}-${i}`} label={c} lit={slaveSteps.includes(c)} />
                          ))}
                        </>
                      ) : (
                        <Text type="secondary">none — platform deploys on push</Text>
                      )}
                    </SchemaNode>
                    <Arrow />
                    <SchemaNode
                      title="hosting"
                      state={
                        run.stages.SLAVE_END || (run.stages.MASTER_END && !slaveWorkflowGenerated) ? 'lit' : 'dim'
                      }
                    >
                      <Chip
                        label="live"
                        lit={!!run.stages.SLAVE_END || (!!run.stages.MASTER_END && !slaveWorkflowGenerated)}
                      />
                    </SchemaNode>
                  </div>
                  <Space size={16} style={{ marginTop: 12 }}>
                    <Text type="secondary">green — happened in this run</Text>
                    <Text type="secondary">dim — not taken (yet)</Text>
                    <Text type="secondary">red — failed</Text>
                  </Space>
                </div>
              )}
            </Space>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DeployTab;
