import { ConfigProvider, theme as antdTheme } from 'antd';
import React from 'react';
import { LogsPage } from './components/LogsPage';
import { DataProvider } from './services/store';
import { ThemeProvider, useTheme } from './theme';

const ThemedApp: React.FC = () => {
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
          minHeight: '100vh',
          background: colors.background,
          color: colors.text,
        }}
      >
        <LogsPage />
      </div>
    </ConfigProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DataProvider>
        <ThemedApp />
      </DataProvider>
    </ThemeProvider>
  );
};
