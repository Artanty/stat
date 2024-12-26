const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
const bodyParser = require('body-parser');
const createPool = require('./core/db_connection')
const checkDBConnection = require('./core/db_check_connection')
app.use(cors());
app.use(bodyParser.json());
const axios = require('axios');

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