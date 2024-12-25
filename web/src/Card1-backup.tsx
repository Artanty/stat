import React from 'react';
import { Line } from '@ant-design/charts';

const DemoLine = () => {
  const config = {
    data: {
      type: 'fetch',
      value: 'https://assets.antv.antgroup.com/g2/temperatures2.json',
    },
    xField: (d) => new Date(d.date),
    yField: 'value',
    shapeField: 'hvh',
    colorField: 'value',
    axis: {
      x: { title: 'date' },
    },
    style: {
      gradient: 'y',
      lineWidth: 1.5,
      lineJoin: 'round',
    },
    scale: {
      x: { utc: true },
      y: { nice: true },
      color: { 
        type: 'threshold', 
        domain: [3, 50, 65], // Define the thresholds for ranges
        range: ['green', 'red', 'blue', 'purple'], // Define the colors for each range
      },
    },
  };
  return <Line {...config} />;
};

export default DemoLine;
