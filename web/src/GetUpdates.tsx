import React, { useEffect, useState } from 'react';

export interface GetUpdatesDataToReturn {
  PORT: number
  isSentToStat: boolean,
}
const GetUpdates = () => {
  const [data, setData] = useState<GetUpdatesDataToReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const payload = {
          projectId: `${process.env.PROJECT_ID}@github`,
          namespace: process.env.NAMESPACE,
          stage: 'RUNTIME',
          eventData: JSON.stringify(
            {
              slaveRepo: process.env.SLAVE_REPO,
              commit: process.env.COMMIT
            }
          )
        }
        
        const response = await fetch(`${process.env.STAT_URL}/add-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        console.log(`SENT TO @stat: ${process.env.PROJECT_ID}@github -> ${process.env.SLAVE_REPO} | ${process.env.COMMIT}`)
        const requestResult = await response.json();
        const result ={
          PORT: Number(process.env.PORT),
          isSentToStat: Boolean(requestResult),
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

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default GetUpdates;