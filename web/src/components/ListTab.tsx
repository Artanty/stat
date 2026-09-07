import { Button, Card, Flex, Select, Switch, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { getEventsList, getProjectsApi, GetEventsListRequest, GetProjectsResponse } from '../api.service';
import { ResponseDataItem } from '../models';
import DateSelect from './DateSelect';
import { useData } from '../services/store';
import { stat_stages } from '../models';
import { useTheme } from '../theme';

const { Text } = Typography;

const ALL = 'all';

const loadState = (key: string, fallback: string) => {
  try {
    const ls = localStorage.getItem(key);
    if (ls && typeof ls === 'string') return ls;
  } catch (e) {}
  return fallback;
};

const ListTab: React.FC = () => {
  const { colors } = useTheme();
  const { eventsDateRange, setEventsDateRange, setEventsDateRangeTrigger } = useData();
  const [projectId, setProjectId] = useState(() => loadState('listProjectId', ALL));
  const [namespace, setNamespace] = useState(() => loadState('listNamespace', ALL));
  const [stage, setStage] = useState(() => loadState('listStage', ALL));
  const [isError, setIsError] = useState<boolean>(() => {
    const v = loadState('listIsError', 'false');
    return v === 'true';
  });
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ResponseDataItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const start = dayjs().startOf('day');
    const end = dayjs().endOf('day');
    setEventsDateRange([start, end]);
    setEventsDateRangeTrigger([
      start.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      end.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
    ]);
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res: GetProjectsResponse = await getProjectsApi();
        const values = Array.from(new Set(res.map((p) => p.projectId)));
        setProjectOptions(values.map((v) => ({ value: v, label: v })));
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    };
    loadProjects();
  }, []);

  const namespaceOptions = [
    { value: ALL, label: 'all' },
    { value: 'web', label: 'web' },
    { value: 'back', label: 'back' },
    { value: 'build', label: 'build' },
  ];

  const stageOptions = [
    { value: ALL, label: 'all' },
    ...Object.keys(stat_stages).map((s) => ({ value: s, label: s })),
  ];

  const handleGetLogs = async () => {
    setLoading(true);
    setError('');
    localStorage.setItem('listProjectId', projectId);
    localStorage.setItem('listNamespace', namespace);
    localStorage.setItem('listStage', stage);
    localStorage.setItem('listIsError', String(isError));
    try {
      const payload: GetEventsListRequest = {
        projectId: projectId === ALL ? undefined : projectId,
        namespace: namespace === ALL ? undefined : namespace,
        stage: stage === ALL ? undefined : stage,
        isError: isError ? 1 : 0,
        dateRange: {
          startDate: dayjs(eventsDateRange[0]).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          endDate: dayjs(eventsDateRange[1]).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        },
        limit: 500,
      };
      const data = await getEventsList(payload);
      setRows(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'projectId', dataIndex: 'projectId' },
    { title: 'namespace', dataIndex: 'namespace', width: 120 },
    { title: 'stage', dataIndex: 'stage', width: 150 },
    {
      title: 'isError',
      dataIndex: 'isError',
      width: 90,
      render: (v: number) => (v ? <Tag color="red">error</Tag> : <Tag>ok</Tag>),
    },
    { title: 'eventData', dataIndex: 'eventData', ellipsis: true },
    { title: 'eventDate', dataIndex: 'eventDate', width: 200 },
  ];

  const labelStyle = { color: colors.muted };

  return (
    <Card
      title="Events list"
      styles={{
        header: { color: colors.muted, backgroundColor: colors.cardHeaderBg, borderBottom: `1px solid ${colors.border}` },
        body: { background: colors.cardBodyBg },
      }}
    >
      <Flex wrap gap={16} align="center" style={{ marginBottom: 16 }}>
        <div>
          <div style={labelStyle}>{'projectId'}</div>
          <Select
            showSearch
            value={projectId}
            onChange={(v) => setProjectId(v)}
            options={[{ value: ALL, label: 'all' }, ...projectOptions]}
            style={{ width: 220 }}
          />
        </div>
        <div>
          <div style={labelStyle}>{'namespace'}</div>
          <Select
            value={namespace}
            onChange={(v) => setNamespace(v)}
            options={namespaceOptions}
            style={{ width: 140 }}
          />
        </div>
        <div>
          <div style={labelStyle}>{'stage'}</div>
          <Select
            value={stage}
            onChange={(v) => setStage(v)}
            options={stageOptions}
            style={{ width: 180 }}
          />
        </div>
        <div>
          <div style={labelStyle}>{'isError'}</div>
          <Switch checked={isError} onChange={setIsError} checkedChildren="error" unCheckedChildren="ok" />
        </div>
        <div>
          <div style={labelStyle}>{'date (range)'}</div>
          <DateSelect />
        </div>
        <Button type="primary" onClick={handleGetLogs} loading={loading}>
          getLogs
        </Button>
      </Flex>

      {error && (
        <Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
          {error}
        </Text>
      )}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        style={{ color: colors.muted }}
      />
    </Card>
  );
};

export default ListTab;
