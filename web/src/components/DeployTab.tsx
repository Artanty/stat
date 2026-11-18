import { Badge, Button, Col, Empty, Input, List, Row, Space, Tag, Timeline, Typography } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { DeployRun, getDeployRuns } from '../api.service';
import { useTheme } from '../theme';
import {
  BRANCH_CHIPS,
  SLAVE_WORKFLOW_MARKS,
  STATUS_META,
  buildTimelineItems,
  fmtRange,
  fmtDate,
  runStatus,
} from '../deployTimeline';

const { Text, Title } = Typography;

interface ProjectRowProps {
  title: string;
  count: number;
  namespaces?: string[];
  badge: 'error' | 'success' | 'processing' | 'warning' | 'default';
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ title, count, namespaces, badge, selected, dimmed, onSelect, onHide, onUnhide }) => {
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
      <Text strong={selected} ellipsis style={{ flexShrink: 1, minWidth: 0 }}>{title}</Text>
      <Space size={2} wrap style={{ flexShrink: 0 }}>
        {(namespaces ?? []).map((ns) => (
          <Tag key={ns} style={{ marginInlineEnd: 0, fontSize: 11, lineHeight: '16px', padding: '0 4px' }}>{ns}</Tag>
        ))}
      </Space>
      <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>{count}</Text>
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

  // sorted by name, with run count, unique namespaces and last-run status, derived from the fetched runs
  const projects = useMemo(() => {
    const map = new Map<string, { count: number; namespaces: string[]; lastRun: DeployRun }>();
    for (const r of runs) {
      const cur = map.get(r.projectId);
      if (!cur) {
        map.set(r.projectId, { count: 1, namespaces: [r.namespace], lastRun: r });
      } else {
        cur.count += 1;
        if (!cur.namespaces.includes(r.namespace)) cur.namespaces.push(r.namespace);
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

  const timelineItems = useMemo(
    () => (run ? buildTimelineItems(run, masterSteps, slaveSteps, colors.border) : []),
    [run, masterSteps, slaveSteps, colors.border]
  );

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
    <div style={{ background: colors.background, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Row gutter={16} style={{ flex: 1, minHeight: 0, marginLeft: 0, marginRight: 0 }}>
        <Col span={5} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
            <Input
              allowClear
              placeholder="search project"
              prefix={<SearchOutlined style={{ color: colors.muted }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {hidden.length > 0 && hideBtn}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                    namespaces={p.namespaces}
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
          </div>
        </Col>
        <Col span={7} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">{visibleRuns.length} runs</Text>
              <Button size="small" loading={loading} onClick={() => loadRuns()}>
                reload
              </Button>
            </Space>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
            </div>
          </div>
        </Col>
        <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!run ? (
            <Empty description="select a run" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
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
                  {fmtRange(run.startDate, run.endDate)}
                </Text>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', wordBreak: 'break-word', minWidth: 0 }}>
                <Timeline mode="left" items={timelineItems} />
              </div>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DeployTab;
