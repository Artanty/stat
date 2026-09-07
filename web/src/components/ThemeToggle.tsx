import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import React from 'react';
import { useTheme } from '../theme';

export const ThemeToggle: React.FC = () => {
  const { isDark, toggle } = useTheme();
  return (
    <Switch
      checked={isDark}
      onChange={toggle}
      checkedChildren={<MoonOutlined />}
      unCheckedChildren={<SunOutlined />}
    />
  );
};
