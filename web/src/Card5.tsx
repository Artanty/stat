import React, { useEffect, useState, useRef } from 'react'
import { LineChart, LineChartProps } from '@opd/g2plot-react'
import { fetchData }  from './api.service';
import { formatDate, swapObject } from './helpers';
export const stat_stages = { //stat_stages
  RUNTIME: 2000,
  PUSH_SLAVE: 1500,
  GET_SAFE: 1000,
  PUSH_MASTER: 500,
  UNKNOWN: 0,
}
 export interface ChartDataItem {
  Date: string, 
  scales: number,
  _date: string
}
export interface ResponseDataItem {
  "id": number
  "projectId": string
  "namespace": string
  "stage": keyof typeof stat_stages
  "isError": number
  "eventData": string
  "eventDate": string
}
const LineChartComponent = () => {
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef();

  const convertResponse = (data: ResponseDataItem[]): ChartDataItem[] => {
    const result: ChartDataItem[] = []
    data
    .filter(el => el.projectId === 'stat@github')
    .sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) 
    .forEach((el: ResponseDataItem) => {
      const chartItem: ChartDataItem = {
        Date: el.eventDate,
        scales: stat_stages[el.stage] ?? stat_stages.UNKNOWN,
        _date: formatDate(el.eventDate, {hours: true})
      }
      result.push(chartItem)
    })
return  result
  }
//   {
//     "id": 1,
//     "projectId": "test@github",
//     "namespace": "back",
//     "state": "DEPLOY",
//     "isError": 0,
//     "eventData": "commit",
//     "eventDate": "2024-09-27T12:00:47.538Z"
// }
// {Date: '2010-01', scales: 1998}
// {Date: '2010-02', scales: 1850}
  useEffect(() => {
    const getData = async () => {
      try {
        // await fetch('https://gw.alipayobjects.com/os/bmw-prod/1d565782-dde4-4bb6-8946-ea6a38ccf184.json')
        await fetchData()
        // .then((res) => res.json())
        .then((data) => {
          // console.log(data.map(el => ({date: el.eventDate, val: stat_stages[el.stage as any]})).sort((a,b) => a.date - b.date))
          // console.log(convertResponse(data).sort((a,b) => +a._date - +b._date))
          console.log(convertResponse(data))
          setData(convertResponse(data))
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const config: LineChartProps = {
    // height: 350,
    data,
    // padding: [20, 20, 30, 110],
    padding: [30, 20, 30, 20],
    xField: 'Date',
    xAxis: {
      label: {
        formatter: (fullDate) => {
          return formatDate(fullDate, {hours: true, minutes: true})
        },
      },
    },
    yField: 'scales',
    yAxis: {
      label: {
        formatter: (v) => {
          return swapObject(stat_stages)[v]; 
        },
        rotate: -0.2,
        offset: -2,
      },
      
    },
    // stepType: 'hvh',
    annotations: [
      {
        type: 'regionFilter',
        start: ['min', '1500'],
        end: ['max', '2100'],
        // start: [ 'min', 0 ],
        // end: [ 'max', 'min' ],
        color: 'green',
      },
      {
        type: 'regionFilter',
        start: ['min', '500'],
        end: ['max', '0'],
        // start: [ 'min', 0 ],
        // end: [ 'max', 'min' ],
        color: 'red',
      },
      // {// надпись над пунктиром
      //   type: 'text',
      //   position: ['min', 'median'],
      //   content: '中位数',
      //   offsetY: -40,
      //   style: {
      //     textBaseline: 'bottom',
      //   },
      // },
      // { // пунктирная линия
      //   type: 'line',
      //   // start: ['min', 'median'],
      //   // end: ['max', 'median'],
      //   start: ['min', 'median'],
      //   end: ['max', 'median'],
      //   style: {
      //     stroke: 'green',
      //     lineDash: [2, 2],
      //   },
      // },
    ],
  };

  return <LineChart {...config} chartRef={chartRef as any} />;
};

export default LineChartComponent;