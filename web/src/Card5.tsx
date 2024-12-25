// import React, { useEffect, useState, useRef } from 'react'
// import { LineChart, LineChartProps } from '@opd/g2plot-react'
// import { formatDate, swapObject } from './helpers';
// export const stat_stages = { //stat_stages
//   RUNTIME: 2000,
//   PUSH_SLAVE: 1500,
//   GET_SAFE: 1000,
//   PUSH_MASTER: 500,
//   UNKNOWN: 0,
// }
//  export interface ChartDataItem {
//   Date: string, 
//   scales: number,
//   _date: string
// }
// export interface ResponseDataItem {
//   "id": number
//   "projectId": string
//   "namespace": string
//   "stage": keyof typeof stat_stages
//   "isError": number
//   "eventData": string
//   "eventDate": string
// }

// interface LineChartComponentProps {
//   events: ResponseDataItem[]; // Passed events prop
//   name: string; // Passed name prop
// }

// const LineChartComponent: React.FC<LineChartComponentProps> = ({ events, name }) => {
//   const [data, setData] = useState<ChartDataItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const chartRef = useRef();

//   const convertResponse = (data: ResponseDataItem[]): ChartDataItem[] => {
//     const result: ChartDataItem[] = []
//     data
//     // .filter(el => el.projectId === 'stat@github')
//     .sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) 
//     .forEach((el: ResponseDataItem) => {
//       const chartItem: ChartDataItem = {
//         Date: el.eventDate,
//         scales: stat_stages[el.stage] ?? stat_stages.UNKNOWN,
//         _date: formatDate(el.eventDate, {hours: true})
//       }
//       result.push(chartItem)
//     })
    
//     return result
//   }
//   useEffect(() => {
//     const getData = async () => {
//       try {
//         // Use the passed `events` prop instead of fetching data
//         const processedData = convertResponse(events);
//         setData(processedData);
//       } catch (err: any) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     getData();
//   }, [events]); // Re-run effect when `events` prop changes

//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   if (error) {
//     return <div>Error: {error}</div>;
//   }

//   const config: LineChartProps = {
//     data,
//     padding: [30, 20, 30, 20],
//     xField: 'Date',
//     xAxis: {
//       label: {
//         formatter: (fullDate) => {
//           return formatDate(fullDate, {hours: true, minutes: true})
//         },
//       },
//     },
//     yField: 'scales',
//     yAxis: {
//       label: {
//         formatter: (v) => {
//           return swapObject(stat_stages)[v]; 
//         },
//         rotate: -0.2,
//         offset: -2,
//       },
      
//     },
//     // stepType: 'hvh',
//     annotations: [
//       {
//         type: 'regionFilter',
//         start: ['min', '1500'],
//         end: ['max', '2100'],
//         color: 'green',
//       },
//       {
//         type: 'regionFilter',
//         start: ['min', '500'],
//         end: ['max', '0'],
//         color: 'red',
//       },
//     ],
//   };

//   return (
//     <div>
//       <h2>{name}</h2> {/* Display the name prop */}
//       <LineChart {...config} chartRef={chartRef as any} />
//     </div>
//   );
// };

// export default LineChartComponent;