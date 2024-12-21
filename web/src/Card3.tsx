import React, { useEffect, useState, useRef } from 'react'
import { HeatmapChart, HeatmapChartProps, LineChart, LineChartProps, RadialBarChart, RadialBarChartProps } from '@opd/g2plot-react'
import { fetchData }  from './api.service';
import { formatDate } from './helpers';
 
const LineChartComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const chartRef = useRef();

  useEffect(() => {
    // fetch('https://gw.alipayobjects.com/os/antfincdn/wOj8DF0KF0/desire-heatmap.json')
    //   .then((res) => res.json())
    //   .then((fetchedData) => {
    //     setData(fetchedData);
    //     setLoading(false);
    //   });
    const getData = async () => {
      try {
        let result = await fetchData();

        const items = [];
        const totalColumns = 12;

        for (let i = 0; i < 96; i++) {
        
          const item = {
            id: i + 1,
            projectId: "doro@github",
            namespace: i % 2 === 0 ? "back" : "web",
            state: i % 2 === 0 ? "DEPLOY" : "RUNTIME",
            isError: Math.random() > 0.5 ? 1 : 0,
            eventData: i % 2 === 0
              ? `https://plan-m3hd.onrender.com/plan/?ext=DORO-00${(i / 2) + 1}`
              : `https://plan-m3hd.onrender.com/noy/?ext=REQUEST-${553 + (i / 2)}`,
            eventDate: new Date(Date.UTC(2024, 11, 10, 10, 0, 47, 538) + (i * 30 * 60 * 1000)).toISOString(),
            
          };

          items.push(item);
        }
        const result2 = items.map((el, i) => {
          const currentRow = Math.floor(i / totalColumns);
          const currentColumn = i % totalColumns;
          
          return { 
            row: String(currentRow),
            col: String(currentColumn),
            "item": '14:30', // el.isError === 1 ? 'E' : 'e', 
            "count": Math.ceil(Math.random() * 100)
          }
        })
        setData(result2 as any);
        
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  function getSizeFactor() {
    const COLS = 12;
    const ROWS = 8;
    const box = document.getElementById('container')?.getBoundingClientRect();
    if (box) {
      const size = Math.min(box.width / COLS, box.height / ROWS);
      return {
        width: size * COLS,
        height: size * ROWS,
        size,
      };
    } else {
      return {
        width:  350,
        height:  350,
        size: 200,
      }
    } 
  }

  const { width, height, size } = getSizeFactor();

  const config2: HeatmapChartProps = {
    data,
      autoFit: true,
      width,
      height,
      xField: 'row',
      yField: 'col',
      colorField: 'count',
      shape: 'square',
      sizeRatio: 1,
      color: [
        '#dcdcdc',
        '#dad0bf',
        '#d9c3a1',
        '#d7b784',
        '#d6aa67',
        '#da9a54',
        '#e3864c',
        '#ec7344',
        '#f65f3c',
        '#ff4b34',
      ],
      tooltip: false,
      xAxis: false,
      yAxis: false,
      meta: {
        count: {
          max: 200,
        },
      },
      label: {
        formatter: (datum) => datum.item,
        layout: [{ type: 'adjust-color' }],
        style: { fontWeight: 700, fontSize: (size / 36) * 14 * (size < 32 ? 1.2 : 1) },
      },
  };

  return <HeatmapChart {...config2}/>;
  
};

export default LineChartComponent;