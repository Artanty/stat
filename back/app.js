const express = require('express');
const pool = require('./core/db_connection');
const cors = require('cors')
const app = express();
app.use(express.json());

const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());

app.post('/add-event', async (req, res) => {
  const { projectId, namespace, stage, isError, eventData, eventDate } = req.body;
  if (!projectId || !namespace || !stage) {
    return res.status(400).json({ error: 'projectId, namespace, and stage are required' });
  }

  const query = 'INSERT INTO events (projectId, namespace, stage, isError, eventData, eventDate) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [projectId, namespace, stage, isError || false, eventData || '', eventDate || new Date().toISOString()];

  try {
    const [result] = await pool.execute(query, values);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/add-event', async (req, res) => {
  const { projectId, namespace, stage, isError, eventData, eventDate } = req.query;
  if (!projectId || !namespace || !stage) {
    return res.status(400).json({ error: 'projectId, namespace, and stage are required' });
  }

  const query = 'INSERT INTO events (projectId, namespace, stage, isError, eventData, eventDate) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [projectId, namespace, stage, isError || false, eventData || '', eventDate || new Date().toISOString()];

  try {
    const [result] = await pool.execute(query, values);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Events API (POST)
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
    const [rows] = await pool.execute(query, values);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3230;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;