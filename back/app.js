const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
const bodyParser = require('body-parser');
const createPool = require('./core/db_connection')
const checkDBConnection = require('./core/db_check_connection')

app.use(cors());
app.use(bodyParser.json());
const fs = require('fs').promises; // Use promises for fs to handle asynchronous operations
const os = require('os');
const axios = require('axios');

app.post('/get-events', async (req, res) => {
  const { id, projectId, namespace, stage, isError, date } = req.body;
  let query = 'SELECT * FROM events';
  try {
    const pool = createPool()
    const connection = await pool.getConnection();
    const [rows] = await connection.query(query);
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
    // Handle specific errors
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

app.post('/table-query', async (req, res) => {
  console.log('table-query req url: ' + req.originalUrl)
  
  let { app_name, query } = req.body;

  if (query.trim().toUpperCase().startsWith('SELECT TABLE_NAME')) {
    // Replace the table_schema placeholder with the actual database name from the environment variable
    const dbName = process.env.DB_DATABASE;
    query = query.replace('table_schema = ?', `table_schema = "${dbName}"`);
    // Check for table_name IN (...) pattern and rename table names inside
    const inPattern = /table_name\s+IN\s+\(([^)]+)\)/i;
    const inMatch = query.match(inPattern);
    if (inMatch) {
      const tableNamesIn = inMatch[1].split(',').map(name => name.trim().replace(/['"]/g, ''));
      const renamedTableNames = tableNamesIn.map(name => `'${app_name}__${name}'`).join(', ');
      query = query.replace(inPattern, `table_name IN (${renamedTableNames})`);
    }
  } else if (query.trim().toUpperCase().startsWith('CREATE TABLE')) {
    const tableName = query.match(/TABLE\s+(\w+)/i)[1];
    const fullTableName = `${app_name}__${tableName}`;
    query = query.replace(tableName, fullTableName)
  } else {
    // Match table names in various SQL statements
    const tableNameMatch = query.match(/(?:INSERT INTO|UPDATE|DELETE FROM|FROM)\s+(\w+)/i);
    if (!tableNameMatch) {
      return res.status(400).send('Invalid SQL query: Could not find a table name');
    }
    const tableName = tableNameMatch[1];
    const fullTableName = `${app_name}__${tableName}`;
    query = query.replace(tableName, fullTableName)
  }

  try {
    const pool = createPool()
    const connection = await pool.getConnection();
    const [rows] = await connection.query(query);
    connection.release();
    res.json(rows)
  } catch (error) {
    console.log(error)
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table ${fullTableName} doesn't exist, create table first by calling POST /table-create with app_name and query parameters`);
    } else if (error.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP()
      res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
    } else {
      res.status(500).send(error.message);
    }
  }
});

app.get('/get-updates', async (req, res) => {
  const publicIP = await getPublicIP()
  res.json({ 
    STAT__STATUS: 'working1', 
    database: process.env.DB_DATABASE,
    id: publicIP,
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