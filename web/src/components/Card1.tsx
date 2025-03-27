import React from 'react';
import { Line } from '@ant-design/charts';
import { formatDate, swapObject } from '../helpers';
import { ResponseDataItem, stat_stages } from '../models';

// export interface ChartDataItem {
//     date: string,
//     value: number
// }
export interface RenderedPoint {
  value: number, color: string, name: string
}

export type ChartDataItem = ResponseDataItem & { renderValue: number }

const formatEvents = (data: ResponseDataItem[]): ChartDataItem[] => {
    const result: ChartDataItem[] = []
    data.forEach((el: ResponseDataItem) => {
        const chartItem: ChartDataItem = {
          ...el,
            // date: el.eventDate,
          renderValue: stat_stages[el.stage] ?? stat_stages.UNKNOWN,
        }
        result.push(chartItem)
    })
    return result
}

const DemoLine = ({ events, name }) => {
  const config = {
    interaction: {
      tooltip: {
        render: (e, { title, items }) => {
          
          return (
            <div key={title}>
              <h4>{formatDate(title.slice(0,18))}</h4>
              {/* <h4>{title}</h4> */}
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
                      {/* <b>sdfsdfsdf</b> */}
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
    // scrollbar: {
    //   x: {
    //     isRound: true
    //   }
    // },
    // tooltip: {
    //   // title: 'date',
    //   // items: [{ 
    //   //   channel: 'y',
    //   //   name: 'custom name'
    //   // }],
    //   valueFormatter: (d) => 'sdsd'
    // },
    // tooltip: false,
    // tooltip: {
    //   title: (d) => (d.value > 100 ? d.name : d.age), // transform
    // },
    // tooltip: {
    //   field: 'renderValue1'
    // },
    // interaction: {
    //   tooltip: {
    //     marker: false,
    //   },
    // },
    xField: (d) => new Date(d.eventDate),
    yField: 'renderValue',
    point: {
      shapeField: 'square',
      sizeField: 4,
    },
    // shapeField: 'hvh',
    colorField: 'renderValue',
    axis: {
      grid: true,
      x: { 
        // title: 'eventDate' 
      },
      // y: {
      //   labelFormatter: (v) => swapObject(stat_stages)[v],
      //   labelAutoEllipsis: true,
      //   labelAutoRotate: true,
      //   labelAutoHide: true,
      //   labelLineWidth: 2,
      //   labelFontSize: 10
      // },
      y: false
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
      <h2>{name}</h2> {/* Display the name prop */}
      <Line {...config} />
    </div>
  );
};

export default DemoLine;