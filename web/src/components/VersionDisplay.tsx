const version = process.env.TAG_VERSION || '0.0.0.0';
import React from 'react';
import { useTheme } from '../theme';

export const VersionDisplay = () => {
  const { colors } = useTheme();
  return (
    <div className="version-display" style={{
      color: colors.muted,
      position: "absolute",
      bottom: "0",
      right: "0",
      fontSize: "10px",
      lineHeight: "1.4",
      marginRight: "53px"
    }}>
      {version}
    </div>
  );
}