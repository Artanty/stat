import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  codeBg: string;
  codeText: string;
  cardHeaderBg: string;
  cardBodyBg: string;
}

export const lightColors: ThemeColors = {
  background: '#f5f7fa',
  surface: '#ffffff',
  text: '#1f1f1f',
  muted: '#595959',
  border: '#d9d9d9',
  codeBg: '#f6f8fa',
  codeText: '#24292e',
  cardHeaderBg: '#fafafa',
  cardBodyBg: '#ffffff',
};

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#141414',
  text: 'rgba(255,255,255,0.88)',
  muted: '#a7a7a7',
  border: '#333333',
  codeBg: '#000000',
  codeText: '#0f0',
  cardHeaderBg: '#000000',
  cardBodyBg: '#000000',
};

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const loadInitialMode = (): ThemeMode => {
  try {
    const ls = localStorage.getItem('themeMode');
    if (ls === 'light' || ls === 'dark') return ls;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {}
  return 'dark';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(loadInitialMode);

  useEffect(() => {
    const isDark = mode === 'dark';
    document.body.style.backgroundColor = isDark ? darkColors.background : lightColors.background;
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem('themeMode', m);
    } catch (e) {}
  };

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === 'dark';
    return {
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      toggle: () => setMode(isDark ? 'light' : 'dark'),
      setMode,
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
