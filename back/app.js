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
      projectId: process.env.REPO,
      namespace: process.env.NAMESPACE,
      stage: 'RUNTIME',
      eventData: {
        triggerIP: triggerIP, 
        slaveRepo: process.env.SLAVE_REPO
      }
    }
    await axios.post(process.env.STAT_URL, payload);
  } catch (error) {
    console.error('error in sendRuntimeEventToStat...');
    console.error(error);
    return null;
  }
}

app.get('/get-updates', async (req, res) => {
  console.log(req)
  const clientIP = req.ip
  await sendRuntimeEventToStat(clientIP)
  // const publicIP = await getPublicIP()
  res.json({ 
    trigger: clientIP,
    PORT: process.env.PORT
   })
})

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