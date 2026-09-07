import { Button, Card, Checkbox, Col, Flex, Row, Segmented, Spin, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { getProjectsStatus, ProjectStatusItem } from '../api.service';
import { useTheme } from '../theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const STORAGE_KEY = 'statV2Checked';
const NS_MODE_KEY = 'statV2NamespaceMode';
const SORT_MODE_KEY = 'statV2SortMode';

const NAMESPACES = ['web', 'back'];

type SortMode = 'recent' | 'abc';
type NamespaceMode = 'all' | 'web' | 'back';

const loadChecked = (): string[] => {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && typeof ls === 'string') {
      const result = JSON.parse(ls);
      if (Array.isArray(result)) return result;
    }
  } catch (e) {}
  return [];
};

const loadNamespaceMode = (): NamespaceMode => {
  try {
    const ls = localStorage.getItem(NS_MODE_KEY);
    if (ls === 'all' || ls === 'web' || ls === 'back') return ls;
  } catch (e) {}
  return 'all';
};

const loadSortMode = (): SortMode => {
  try {
    const ls = localStorage.getItem(SORT_MODE_KEY);
    if (ls === 'recent' || ls === 'abc') return ls;
  } catch (e) {}
  return 'recent';
};

const StatV2Tab: React.FC = () => {
  const { colors } = useTheme();
  const [projects, setProjects] = useState<ProjectStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<string[]>(loadChecked);
  const [nsMode, setNsMode] = useState<NamespaceMode>(loadNamespaceMode);
  const [sortMode, setSortMode] = useState<SortMode>(loadSortMode);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const data = await getProjectsStatus({ limit: 5 });
        setProjects(data);
      } catch (e: any) {
        console.error('Failed to fetch projects status:', e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch (e) {}
  }, [checked]);

  useEffect(() => {
    try {
      localStorage.setItem(NS_MODE_KEY, nsMode);
    } catch (e) {}
  }, [nsMode]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_MODE_KEY, sortMode);
    } catch (e) {}
  }, [sortMode]);

  const projectKey = (p: ProjectStatusItem) => `${p.projectId}-${p.namespace}`;

  const onCheckedChange = (values: string[]) => {
    setChecked(values);
  };

  const activeNamespaces = nsMode === 'all' ? NAMESPACES : [nsMode];

  const sortProjects = (list: ProjectStatusItem[]): ProjectStatusItem[] => {
    if (sortMode === 'abc') {
      return [...list].sort((a, b) => projectKey(a).localeCompare(projectKey(b)));
    }
    const withDate = list.filter((p) => p.lastEventDate);
    const withoutDate = list.filter((p) => !p.lastEventDate);
    withDate.sort(
      (a, b) => new Date(b.lastEventDate!).getTime() - new Date(a.lastEventDate!).getTime()
    );
    return [...withDate, ...withoutDate];
  };

  const namespaceProjects = useMemo(
    () => sortProjects(projects.filter((p) => activeNamespaces.includes(p.namespace))),
    [projects, nsMode, sortMode]
  );

  const allChecked = useMemo(
    () => namespaceProjects.length > 0 && checked.length === namespaceProjects.length,
    [namespaceProjects, checked]
  );

  const toggleAll = () => {
    if (allChecked) {
      setChecked([]);
    } else {
      setChecked(namespaceProjects.map(projectKey));
    }
  };

  const visibleProjects = useMemo(
    () =>
      sortProjects(
        projects.filter(
          (project) =>
            activeNamespaces.includes(project.namespace) &&
            checked.includes(projectKey(project))
        )
      ),
    [projects, nsMode, checked, sortMode]
  );

  const getStatusColor = (project: ProjectStatusItem): string => {
    if (project.errorCount > 0) return 'error';
    if (project.totalEvents === 0) return 'default';
    return 'success';
  };

  const getButtonColor = (project: ProjectStatusItem): 'primary' | 'danger' | 'default' => {
    if (project.errorCount > 0) return 'danger';
    if (project.totalEvents === 0) return 'default';
    return 'primary';
  };

  const formatLastActive = (date: string | null): string => {
    if (!date) return 'Never';
    return dayjs(date).fromNow();
  };

  const renderRecentEvents = (events: ProjectStatusItem['recentEvents']) => {
    if (!events || events.length === 0) {
      return <Text type="secondary" style={{ fontSize: 12 }}>No recent events</Text>;
    }
    return (
      <div style={{ maxHeight: 150, overflow: 'auto', fontSize: 11 }}>
        {events.map((event, idx) => (
          <div key={idx} style={{ 
            padding: '4px 0', 
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <Tag color={event.isError ? 'error' : 'default'} style={{ marginRight: 8 }}>
              {event.stage}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(event.eventDate).format('HH:mm:ss')}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: colors.muted 
      }}>
        Error: {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: colors.muted 
      }}>
        No projects found
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Flex wrap gap="middle" align="center" justify="space-between" style={{ marginBottom: 16 }}>
        <Flex wrap gap="small">
          {(['all', ...NAMESPACES] as NamespaceMode[]).map((mode) => (
            <Button
              key={mode}
              size="small"
              color={nsMode === mode ? 'primary' : 'default'}
              variant="outlined"
              onClick={() => setNsMode(mode)}
            >
              {mode}
            </Button>
          ))}
        </Flex>

        <Segmented
          value={sortMode}
          size="small"
          options={[
            { value: 'recent', label: 'recent' },
            { value: 'abc', label: 'abc' },
          ]}
          onChange={(value) => setSortMode(value as SortMode)}
        />
      </Flex>

      <Flex wrap gap="small" align="center" style={{ marginBottom: 16 }}>
        <Checkbox.Group value={checked} onChange={onCheckedChange}>
          <Flex wrap gap="small">
            <Button
              size="small"
              color="purple"
              variant={allChecked ? 'solid' : 'outlined'}
              onClick={toggleAll}
            >
              all
            </Button>
            {namespaceProjects.map((project) => {
              const key = projectKey(project);
              const selected = checked.includes(key);
              return (
                <Button
                  key={key}
                  size="small"
                  color={selected ? getButtonColor(project) : 'default'}
                  variant="outlined"
                >
                  <Checkbox value={key} style={{ color: 'inherit' }}>
                    {key}
                  </Checkbox>
                </Button>
              );
            })}
          </Flex>
        </Checkbox.Group>
      </Flex>

      <Row gutter={[16, 16]}>
        {visibleProjects.map((project) => (
          <Col key={projectKey(project)} xs={24} sm={12} lg={8} xl={6}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {project.projectId}
                  </span>
                  <Tag color={getStatusColor(project)}>
                    {project.errorCount > 0 ? `${project.errorCount} errors` : 'OK'}
                  </Tag>
                </div>
              }
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {project.namespace}
                </Text>
              }
              styles={{
                header: { 
                  backgroundColor: colors.cardHeaderBg, 
                  borderBottom: `1px solid ${colors.border}` 
                },
                body: { background: colors.cardBodyBg },
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Total Events</Text>
                  <Text strong>{project.totalEvents}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Last Active</Text>
                  <Text>{formatLastActive(project.lastEventDate)}</Text>
                </div>
              </div>
              
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Recent Events
                </Text>
                {renderRecentEvents(project.recentEvents)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default StatV2Tab;
