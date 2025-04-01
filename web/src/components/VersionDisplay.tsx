const version = process.env.TAG_VERSION || '0.0.0.0';
import React from 'react';

export const VersionDisplay = () => {
  return (
    <div className="version-display" style={{
      color: "#ffffff96",
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