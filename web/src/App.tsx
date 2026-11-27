import { ConfigProvider, theme as antdTheme } from 'antd';
import React from 'react';
import { DeployPage } from './components/DeployPage';
import { MiniPage } from './components/MiniPage';
import { ThemeProvider, useTheme } from './theme';

const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, colors } = useTheme();

  
  

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorBgBase: colors.background,
          colorBgContainer: colors.surface,
          colorTextBase: colors.text,
          colorBorder: colors.border,
          colorPrimary: '#4d9fff',
        },
      }}
    >
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: colors.background,
          color: colors.text,
        }}
      >
        {children}
      </div>
    </ConfigProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ThemedApp>
        <DeployPage />
      </ThemedApp>
    </ThemeProvider>
  );
};

export const MiniApp: React.FC = () => {
  return (
    <ThemeProvider>
      <ThemedApp>
        <MiniPage />
      </ThemedApp>
    </ThemeProvider>
  );
};
