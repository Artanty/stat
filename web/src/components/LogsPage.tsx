import { Tabs } from 'antd';
import React from 'react';
import { useSearchParams } from 'react-router';
import ListTab from './ListTab';
import LogsTab from './LogsTab';
import { StatPanel } from './StatPanel';
import StatV2Tab from './StatV2Tab';
import DeployTab from './DeployTab';
import { FeatureSlot } from '../FeatureSlot';
import { gateWakeTarget, wakeOpts } from '../feat-gate';
import { useTheme } from '../theme';

export const LogsPage: React.FC = () => {
  const { colors } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('tab') || 'stat';

  return (
    <div style={{ padding: 16, background: colors.background }}>
      {/* feat bootstrap slots: wake-up v3 MANUAL (dormant until http-gate sees a failure
          against the sleeping Render back), script-only infra (bus, global-loading,
          http-gate — config in feat-gate.ts), and the version-display badge. */}
      <FeatureSlot
        slot="app-init"
        attrs={{ target: gateWakeTarget(), project: 'stat', manual: '', ...wakeOpts() }}
      />
      <FeatureSlot slot="app-infra" />
      <FeatureSlot
        slot="app-version"
        attrs={{ version: process.env.TAG_VERSION || '0.0.0.0', project: 'stat', namespace: 'web' }}
      />
      <Tabs
        activeKey={activeKey}
        onChange={(key) => setSearchParams({ tab: key })}
        items={[
          { key: 'stat', label: 'stat', children: <StatPanel /> },
          { key: 'stat-v2', label: 'stat v2', children: <StatV2Tab /> },
          { key: 'deploy', label: 'deploy', children: <DeployTab /> },
          { key: 'logs', label: 'render.com logs', children: <LogsTab /> },
          { key: 'list', label: 'list', children: <ListTab /> },
        ]}
        tabBarStyle={{ borderColor: colors.border }}
      />
    </div>
  );
};
