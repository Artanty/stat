import { Badge, Button, Empty, Select, Space, Switch, Tag, Timeline, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { DeployRun, getDeployRuns } from '../api.service';
import { FeatureSlot } from '../FeatureSlot';
import { gateWakeTarget, wakeOpts } from '../feat-gate';
import { useTheme } from '../theme';
import { STATUS_META, buildTimelineItems, fmtRange, runStatus } from '../deployTimeline';

const { Text } = Typography;

// compact deploy summary: project select -> last run info -> full timeline, block under block
export const MiniPage: React.FC = () => {
  const { colors } = useTheme();
  const [runs, setRuns] = useState<DeployRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<string | null>(null);
  // 'last' mode: follow the project with the latest event, auto-reload every minute
  const [lastMode, setLastMode] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await getDeployRuns({ limit: 50 });
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const projects = useMemo(() => {
    const set = new Map<string, number>();
    for (const r of runs) set.set(r.projectId, (set.get(r.projectId) || 0) + 1);
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [runs]);

  useEffect(() => {
    if (projects.length && (project === null || !projects.some(([p]) => p === project))) {
      setProject(projects[0][0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // last mode: select stays pinned to whichever project fired the latest event (runs are newest-first)
  useEffect(() => {
    if (lastMode && runs.length) setProject(runs[0].projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, lastMode]);

  // last mode: refresh everything every minute
  useEffect(() => {
    if (!lastMode) return;
    const timer = setInterval(loadRuns, 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMode]);

  // runs arrive newest-first — the last run is simply the first match
  const run = useMemo(() => runs.find((r) => r.projectId === project) ?? null, [runs, project]);

  const masterSteps = run?.stages.MASTER_END?.steps ?? run?.stages.MASTER_ERROR?.steps ?? [];
  const slaveSteps = run?.stages.SLAVE_END?.steps ?? run?.stages.SLAVE_ERROR?.steps ?? [];
  const timelineItems = useMemo(
    () => (run ? buildTimelineItems(run, masterSteps, slaveSteps, colors.border) : []),
    [run, masterSteps, slaveSteps, colors.border]
  );

  const block: React.CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.surface,
    padding: '10px 12px',
  };

  return (
    <div style={{ padding: 16, background: colors.background, minHeight: '100vh' }}>
      {/* feat bootstrap slots (same infra as the deploy page) */}
      <FeatureSlot
        slot="app-init"
        attrs={{ target: gateWakeTarget(), project: 'stat', manual: '', ...wakeOpts() }}
      />
      <FeatureSlot slot="app-infra" />

      <div style={{ width: 490, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={block}>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>project</Text>
              <Space size={8}>
                <Space size={4}>
                  <Switch size="small" checked={lastMode} onChange={setLastMode} />
                  <Text type="secondary" style={{ fontSize: 12 }}>last</Text>
                </Space>
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined spin={loading} />}
                  disabled={lastMode || loading}
                  onClick={() => loadRuns()}
                />
              </Space>
            </div>
            <Select
              style={{ width: '100%' }}
              loading={loading}
              value={project ?? undefined}
              disabled={lastMode}
              onChange={(p) => setProject(p)}
              options={projects.map(([p, count]) => ({ value: p, label: `${p} (${count})` }))}
              notFoundContent={<Empty description="no runs" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            />
          </Space>
        </div>

        {run && (
          <div style={block}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space size={8} wrap>
                <Badge status={STATUS_META[runStatus(run)].badge} text={STATUS_META[runStatus(run)].label} />
                {run.tag && <Tag color="blue">v{run.tag}</Tag>}
                <Tag>{run.namespace}</Tag>
              </Space>
              <Text ellipsis style={{ width: '100%' }}>{run.commitMessage || '—'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {fmtRange(run.startDate, run.endDate)}
              </Text>
            </Space>
          </div>
        )}

        {run ? (
          <div style={block}>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden', wordBreak: 'break-word' }}>
              <Timeline mode="left" items={timelineItems} />
            </div>
          </div>
        ) : (
          !loading && (
            <div style={block}>
              <Empty description="no runs" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MiniPage;
