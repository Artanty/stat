const express = require('express');
const app = express();
const cors = require('cors');
const createPool = require('./core/db_connection')
const checkDBConnection = require('./core/db_check_connection')
app.use(cors());
app.use(express.json());
const axios = require('axios');
const dayjs = require('dayjs');

/**
 * too much rows without filter - DO NOT USE
 */
app.post('/get-events', async (req, res) => {
  const { id, projectId, namespace, stage, isError, date } = req.body;
  let query = 'SELECT * FROM events';
  const conditions = [];
  const values = [];

  if (id) {
    conditions.push('id = ?');
    values.push(id);
  }
  if (projectId) {
    conditions.push('projectId = ?');
    values.push(projectId);
  }
  if (namespace) {
    conditions.push('namespace = ?');
    values.push(namespace);
  }
  if (stage) {
    conditions.push('stage = ?');
    values.push(stage);
  }
  if (isError !== undefined) {
    conditions.push('isError = ?');
    values.push(isError);
  }
  if (date) {
    conditions.push('date = ?');
    values.push(date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  try {
    const pool = createPool()
    const connection = await pool.getConnection();
    const [rows] = await connection.query(query, values);
    connection.release();
    res.json(rows)
  } catch (error) {
    console.log(error)
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table events doesn't exist`);
    } else if (error.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP()
      res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
    } else {
      res.status(500).send(error.message);
    }
  }
});


// Function to build the SQL query for the last 30 rows of each project@namespace
function buildLast30RowsQuery(combinations, dateRange) {
  let queries = []
  if (dateRange) {
    /**
     * get last 30 rows of each for given date range
     */
    queries = combinations.map(({ projectId, namespace }) => {
      return `
          (SELECT *
          FROM events
          WHERE projectId = '${projectId}' AND namespace = '${namespace}'
            AND eventDate >= NOW() - INTERVAL ${dateRange}
          ORDER BY eventDate DESC
          LIMIT 30)
        `;
    });
  } else {
    /**
     * get last 30 rows of each
     */
    queries = combinations.map(({ projectId, namespace }) => {
      return `
          (SELECT *
          FROM events
          WHERE projectId = '${projectId}' AND namespace = '${namespace}'
          ORDER BY eventDate DESC
          LIMIT 30)
        `;
    });
  }

  return queries.join('\nUNION ALL\n');
}

// request payload:
// "dateRange": {
//     "startDate": string
//     "endDate": string
//   },
// projectIds: string
// limit: number
// example:
// {
//   "projectId": "flow@github-back",
//   "dateRange": {
//       "startDate": "2024-01-01",
//       "endDate": "2025-12-31"
//   },
//   "limit": 120
// }
app.post('/get-last-events', async (req, res) => {
  const { startDate, endDate } = req.body.dateRange || {};
  const projectId = req.body.projectId?.split('-')[0];
  const limit = req.body.limit || 10;

  // Validate required parameters
  if (!startDate || !endDate || !projectId) {
    return res.status(400).json({ 
      error: 'Missing required parameters: dateRange.startDate, dateRange.endDate, or projectId' 
    });
  }

  try {
    const pool = createPool();
    const connection = await pool.getConnection();
    const namespace = req.body.projectId?.split('-')[1];
    
    // Validate date format (optional but recommended)
    if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Parameterized query to prevent SQL injection
    const queryParams = [projectId, startDate, endDate, limit];
    let sqlQuery = `
      SELECT *
      FROM events
      WHERE projectId = ?
        AND eventDate BETWEEN ? AND ?
      ORDER BY eventDate DESC
      LIMIT ?
    `;

    // Add namespace filter if provided
    if (namespace) {
      sqlQuery = `
        SELECT *
        FROM events
        WHERE projectId = ? 
          AND namespace = ?
          AND eventDate BETWEEN ? AND ?
        ORDER BY eventDate DESC
        LIMIT ?
      `;
      queryParams.splice(1, 0, namespace); // Insert namespace after projectId
    }

    const [rows] = await connection.query(sqlQuery, queryParams);
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    
    // Custom error handling
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({ error: `Table 'events' doesn't exist` });
    } else if (error.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP();
      res.status(503).json({ 
        error: `Database connection refused`,
        solution: `Add this IP to allowed connections: ${publicIP}`
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// app.post('/get-last-events-all', async(req, res) => {
//   const dateRange = req.body.dateRange ?? null
//   try {
//     const pool = createPool()
//     const connection = await pool.getConnection();
//     // Step 1: Get unique combinations of projectId and namespace
//     const [uniqueCombinations] = await connection.query(`
//         SELECT DISTINCT projectId, namespace
//         FROM events
//     `);

//     // Step 2: Build the second query to get the last 30 rows for each combination
//     const sqlQuery = buildLast30RowsQuery(uniqueCombinations, dateRange);

//     // Step 3: Execute the built query
//     const [rows] = await connection.query(sqlQuery);

//     connection.release();
//     res.json(rows)

//   } catch (error) {
//     console.log(error)
//     if (error.code === 'ER_NO_SUCH_TABLE') {
//       res.status(404).send(`Table events doesn't exist`);
//     } else if (error.code === 'ECONNREFUSED') {
//       const publicIP = await getPublicIP()
//       res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
//     } else {
//       res.status(500).send(error.message);
//     }
//   }
// })

app.post('/add-event', async (req, res) => {
  const { projectId, namespace, stage, isError, eventData, eventDate } = req.body;

  // Validate required fields
  if (!projectId || !namespace || !stage) {
    return res.status(400).json({ error: 'projectId, namespace, and stage are required' });
  }

  // Prepare query and values
  const query = 'INSERT INTO events (projectId, namespace, stage, isError, eventData, eventDate) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [projectId, namespace, stage, isError || false, eventData || '', eventDate || new Date().toISOString()];

  try {
    // Get a connection from the pool
    const pool = createPool();
    const connection = await pool.getConnection();

    // Execute the query
    const [result] = await connection.query(query, values);

    // Release the connection back to the pool
    connection.release();

    // Return the newly inserted event ID
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.log(error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table events doesn't exist`);
    } else if (error.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP();
      res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
    } else {
      res.status(500).send(error.message);
    }
  }
});

app.post('/get-projects', async (req, res) => {
  try {
    const safeRes = await axios.post(`${process.env.SAFE_URL}/get-entries`, {})
    res.status(200).json(safeRes.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
})


async function sendRuntimeEventToStat(triggerIP) {
  try {
    const payload = {
      projectId: `${process.env.PROJECT_ID}@github`,
      namespace: process.env.NAMESPACE,
      stage: 'RUNTIME',
      eventData: JSON.stringify(
        {
          triggerIP: triggerIP,
          projectId: process.env.PROJECT_ID,
          slaveRepo: process.env.SLAVE_REPO,
          commit: process.env.COMMIT
        }
      )
    }
    await axios.post(`${process.env.STAT_URL}/add-event`, payload);
    console.log(`SENT TO @stat: ${process.env.PROJECT_ID}@github -> ${process.env.SLAVE_REPO} | ${process.env.COMMIT}`)
    return true
  } catch (error) {
    console.error('error in sendRuntimeEventToStat...');
    if (axios.isAxiosError(error)) {
      // Handle Axios-specific errors
      const axiosError = error; // as AxiosError
      console.error('Axios Error:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
      });
    } else {
        // Handle generic errors
        console.error('Unexpected Error:', error);
    }
    return false;
  }
}

// Function to check if the current minute is one of [0, 15, 30, 45]
function shouldRunStat(currentMinute) { // : boolean
  return [1, 15, 30, 45].includes(currentMinute);
}

// Global variable to track the last minute when sendRuntimeEventToStat was called
let lastExecutedMinute = null; // : number | null

//(req: Request, res: Response) => {
app.get('/get-updates', async (req, res) => {
  const clientIP = req.ip;

  // Parse URL parameters
  const { stat } = req.query;

  let sendToStatResult = false;

  // Get the current minute
  const now = new Date();
  const currentMinute = now.getMinutes();

  // Check if stat=true is in the URL params
  if (stat === 'true') {
      sendToStatResult = await sendRuntimeEventToStat(clientIP);
  } else {
      // If stat is not true, check the current time and whether the function was already called this minute
      if (shouldRunStat(currentMinute) && lastExecutedMinute !== currentMinute) {
          lastExecutedMinute = currentMinute; // Update the last executed minute
          sendToStatResult = await sendRuntimeEventToStat(clientIP);
      }
  }

  res.json({
      trigger: clientIP,
      PORT: process.env.PORT,
      isSendToStat: sendToStatResult,
  });
});

async function getPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error);
    return null;
  }
}

(async () => {
  await checkDBConnection();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();