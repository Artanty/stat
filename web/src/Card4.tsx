import React, { useEffect, useState, useRef } from 'react'
import { HeatmapChart, HeatmapChartProps, LineChart, LineChartProps, RadialBarChart, RadialBarChartProps } from '@opd/g2plot-react'
import { fetchData }  from './api.service';
import { formatDate } from './helpers';
 
const LineChartComponent = () => {
  const [data, setData] = useState<any[]>([]);
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
    const remapByDate = (data: any[]) => {
      const result: any[] = []
      console.log(data)
      const dates = Array.from(new Set(data.map(el=>el.eventDate.slice(0,10)))) // 
      dates.forEach(date => {
        result.push(data.filter(el=> el.eventDate.slice(0,10) === date))
      })
      console.log(dates)
      
      return result;
    }

    const remap = (data: any[]) => {
      console.log(data)
      let result: any = {}
      data.forEach(el => {
        const name = el.projectId
        if (!result[name]) {
          result[name] = []
        }
        result[name].push(el)
      })
      
      return result;
    }

    const getData = async () => {
      try {
        // let result = await fetchData();
        let items = [];
        for (let i = 0; i < 96; i++) {
          const item = {
            id: i + 1,
            projectId: 'doro@github',//i % 2 === 0 ? "doro@github" : "noy@github",
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
        items = remap(items)
        items = Object.entries(items).reduce((acc: any, curr: [key: string, value: any]) => {
          acc[curr[0]] = remapByDate(curr[1])
          return acc
        }, {})
        console.log(items)
        setData(items);
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

  return (
    <div>
      {Object.entries(data).map(([projectId, days], projectIndex) => (
        <div key={projectIndex}>
          <h2>{projectId}</h2>
          <div className='days__wrapper'>
            {days.map((day: any, dayIndex: number) => (
              <div key={dayIndex}>
                <h3>{formatDate(day[0].eventDate, {day: true, month: true})}</h3>
                <div className='times__wrapper'>
                  {day.map((time: any, timeIndex: number) => (
                    <div key={timeIndex} 
                    className='time'
                    style={{ background: time.isError ? 'rgb(23 85 181)' : '#2490fc' }}
                    title={time.eventDate.slice(11,16)}
                    >
                      <div></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
      ))}
    </div>
  );
  
};

export default LineChartComponent;