import { Tabs } from 'antd';
import React from 'react';
import { useSearchParams } from 'react-router';
import ListTab from './ListTab';
import LogsTab from './LogsTab';
import { StatPanel } from './StatPanel';
import StatV2Tab from './StatV2Tab';
import { useTheme } from '../theme';

export const LogsPage: React.FC = () => {
  const { colors } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('tab') || 'stat';

  return (
    <div style={{ padding: 16, background: colors.background }}>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => setSearchParams({ tab: key })}
        items={[
          { key: 'stat', label: 'stat', children: <StatPanel /> },
          { key: 'stat-v2', label: 'stat v2', children: <StatV2Tab /> },
          { key: 'logs', label: 'render.com logs', children: <LogsTab /> },
          { key: 'list', label: 'list', children: <ListTab /> },
        ]}
        tabBarStyle={{ borderColor: colors.border }}
      />
    </div>
  );
};
