import React, { useEffect, useState } from 'react';

const GetUpdates = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data on component initialization
    const fetchData = async () => {
      try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        const result2 ={
          PORT: process.env.PORT,
          isSendToStat: Boolean(result),
        }
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // return (
  //   <div>
  //     <pre>{JSON.stringify(data, null, 2)}</pre>
  //   </div>
  // );
  return (
    <div>
      <strong>API Key:</strong> {process.env.REACT_APP_API_KEY}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default GetUpdates;