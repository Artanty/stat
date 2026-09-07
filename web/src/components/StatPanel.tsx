import { Layout } from 'antd';
import React from 'react';
import FilterPanel from './FilterPanel';
import MyGridLayout from './GridLayout';
import { VersionDisplay } from './VersionDisplay';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../theme';

const { Header, Content } = Layout;

export const StatPanel: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Layout>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          height: 'auto',
          paddingTop: '7px',
          paddingBottom: '7px',
          background: colors.background,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <FilterPanel></FilterPanel>
        <ThemeToggle></ThemeToggle>
        <VersionDisplay></VersionDisplay>
      </Header>
      <Content style={{ padding: '0 48px', background: colors.background, }}>
        <div
          style={{
            minHeight: 380,
            background: colors.background,
          }}
        >
          <MyGridLayout/>
        </div>
      </Content>
    </Layout>
  );
};
