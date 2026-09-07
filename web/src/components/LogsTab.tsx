import { Button, Card, DatePicker, Flex, Form, Input, InputNumber, Select, Spin, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useState } from 'react';
import { getRenderLogs, RenderLogsResponse } from '../api.service';
import { useTheme } from '../theme';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const STORAGE_KEY = 'renderLogsForm';

interface LogsFormValues {
  apiKey?: string;
  ownerId?: string;
  resource?: string;
  dateRange?: [Dayjs, Dayjs];
  direction?: 'forward' | 'backward';
  type?: string;
  limit?: number;
}

const loadState = (): LogsFormValues => {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && typeof ls === 'string') {
      const parsed = JSON.parse(ls);
      if (parsed.dateRange && Array.isArray(parsed.dateRange)) {
        parsed.dateRange = [dayjs(parsed.dateRange[0]), dayjs(parsed.dateRange[1])];
      }
      return parsed;
    }
  } catch (e) {
    console.log(e);
  }
  return {
    direction: 'backward',
    limit: 100,
    dateRange: [dayjs().startOf('day'), dayjs().endOf('day')],
  };
};

const LogsTab: React.FC = () => {
  const { colors } = useTheme();
  const [form] = Form.useForm<LogsFormValues>();
  const [initialValues] = useState<LogsFormValues>(loadState);
  const [loading, setLoading] = useState(false);
  const [logsText, setLogsText] = useState('');
  const [error, setError] = useState('');

  const handleGetLogs = async (values: LogsFormValues) => {
    setLoading(true);
    setError('');
    const startTime = values.dateRange?.[0]
      ? values.dateRange[0].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
      : undefined;
    const endTime = values.dateRange?.[1]
      ? values.dateRange[1].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
      : undefined;
    const storage = { ...values, dateRange: values.dateRange?.map((d) => d.toISOString()) };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
      const res: RenderLogsResponse = await getRenderLogs({
        apiKey: values.apiKey || '',
        ownerId: values.ownerId || '',
        resource: values.resource || '',
        startTime,
        endTime,
        direction: values.direction,
        type: values.type,
        limit: values.limit,
      });
      setLogsText(res.logs.map((l) => l.message).join('\n'));
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Render.com logs"
      styles={{
        header: { color: colors.muted, backgroundColor: colors.cardHeaderBg, borderBottom: `1px solid ${colors.border}` },
        body: { background: colors.cardBodyBg },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleGetLogs}
        style={{ maxWidth: 900, color: colors.text }}
      >
        <Flex wrap gap={16}>
          <Form.Item label={<Text style={{ color: colors.muted }}>API key</Text>} name="apiKey" style={{ marginBottom: 12 }}>
            <Input.Password placeholder="Render API key (Bearer)" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Owner/Workspace ID</Text>} name="ownerId" style={{ marginBottom: 12 }}>
            <Input placeholder="ownerId" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Resource ID</Text>} name="resource" style={{ marginBottom: 12 }}>
            <Input placeholder="resource (server/cronjob/job/postgres/redis)" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Direction</Text>} name="direction" style={{ marginBottom: 12 }}>
            <Select
              options={[
                { value: 'backward', label: 'backward (most recent first)' },
                { value: 'forward', label: 'forward (oldest first)' },
              ]}
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Date range</Text>} name="dateRange" style={{ marginBottom: 12 }}>
            <RangePicker showTime />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Type</Text>} name="type" style={{ marginBottom: 12 }}>
            <Input placeholder="app / request / build" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: colors.muted }}>Limit</Text>} name="limit" style={{ marginBottom: 12 }}>
            <InputNumber min={1} max={100} style={{ width: 120 }} />
          </Form.Item>
        </Flex>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Get logs
          </Button>
        </Form.Item>
      </Form>

      {error && (
        <Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
          {error}
        </Text>
      )}

      <pre
        style={{
          background: colors.codeBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: 12,
          color: colors.codeText,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 600,
          minHeight: 200,
          margin: 0,
        }}
      >
        <code>{loading && !logsText ? <Spin size="small" /> : logsText || 'No logs yet. Fill the form and press "Get logs".'}</code>
      </pre>
    </Card>
  );
};

export default LogsTab;
