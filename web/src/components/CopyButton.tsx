import { CopyOutlined } from '@ant-design/icons';
import React from 'react';

const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <span onClick={handleCopy}>
      <CopyOutlined />
    </span>
  );
};

export default CopyButton;