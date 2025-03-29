import React from 'react';
import { Line } from '@ant-design/charts';
import { formatDate, swapObject } from '../helpers';
import { ResponseDataItem, stat_stages } from '../models';

export interface RenderedPoint {
  value: number, color: string, name: string
}

export type ChartDataItem = ResponseDataItem & { renderValue: number }

const formatEvents = (data: ResponseDataItem[]): ChartDataItem[] => {
    return data.map((el: ResponseDataItem) => ({
        ...el,
        renderValue: stat_stages[el.stage] ?? stat_stages.UNKNOWN,
    }));
}

const StatLineChart = ({ events, name }) => {
  const config = {
    theme: "classicDark",
    interaction: {
      tooltip: {
        render: (e, { title, items }) => {
          return (
            <div style={{ color: '#fff' }} key={title}>
              <h4>{formatDate(title.slice(0,18))}</h4>
              {items
              .filter((el: RenderedPoint) => el.name === 'renderValue')
              .map((item: RenderedPoint) => {            
                return (
                  <div>
                    <div style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: swapObject(stat_stages)[item.value] === 'UNKNOWN' ? 'red' : 'green',
                            marginRight: 6,
                            
                          }}
                        ></span>
                        <span>{swapObject(stat_stages)[item.value]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        },
      },
    },
    data: formatEvents(events), // Use the data passed from the parent component
    legend: false,
    xField: (d) => new Date(d.eventDate),
    yField: 'renderValue',
    colorField: 'renderValue',
    point: { // точка на графике
      size: 6,
      shape: 'circle',
      sizeField: 4,
      style: {
        lineWidth: 2,
      },
    },
    axis: {
      x: { // подписи x шкалы
        label: true,
        labelFill: '#fff',
      },
      y: false // подписи вертикальной шкалы
    },
    slider: {
      x: {
        // values: [0.1, 0.2],
      },
    },
    style: {
      gradient: 'y',
      lineWidth: 2,
      lineJoin: 'round',
      background: '#f8f9fa',
    },
    scale: {
      x: { utc: true },
      y: { nice: true },
      color: {
        type: 'threshold',
        domain: [500, 1000, 1500], // Define the thresholds for ranges
        range: ['red', 'orange', '#72e97a', '#73aff5'], // Define the colors for each range
      },
    },
  };
  return (
    <div>
      <Line {...config} />
    </div>
  );
};

export default StatLineChart;