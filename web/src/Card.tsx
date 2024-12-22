import React, { useEffect, useState, useRef } from 'react'
import { LineChart, LineChartProps } from '@opd/g2plot-react'
import { fetchData }  from './api.service';
import { formatDate } from './helpers';
 
const LineChartComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef();

  
  useEffect(() => {
    const getData = async () => {
      try {
        let result = await fetchData();
        result = result.map(el => ({
          date: formatDate(el.eventDate),
          value: el.isError ? 5 : 10
        }))
        // console.log(result)
        // const formattedDate = formatDate(result);
        // console.log(formattedDate); // Output: 27.09.24 12:00
        setData(result);
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
    height: 350,
    autoFit: true,
    xField: 'date',
    yField: 'value',
    smooth: true,
    meta: {
      value: {
        max: 15,
      },
    },
    data,
  };

  return <LineChart {...config} chartRef={chartRef as any} />;
};

export default LineChartComponent;