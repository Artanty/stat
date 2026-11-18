import React from 'react';
import DeployTab from './DeployTab';
import { FeatureSlot } from '../FeatureSlot';
import { gateWakeTarget, wakeOpts } from '../feat-gate';
import { useTheme } from '../theme';

export const DeployPage: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div
      style={{
        padding: 16,
        boxSizing: 'border-box',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: colors.background,
      }}
    >
      {/* feat bootstrap slots: wake-up v4 MANUAL (dormant until http-gate sees a failure
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
      <DeployTab />
    </div>
  );
};

export default DeployPage;
