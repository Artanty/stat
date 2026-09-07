import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ResultSetHeader } from 'mysql2/promise';
import createPool from './core/db_connection.js';
import checkDBConnection from './core/db_check_connection.js';
import getVersion from './core/get_version.js';
import versionInterceptor from './middleware/versionInterceptor.js';
import retry from 'async-retry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERROR_LOG_PATH = path.join(__dirname, 'storage', 'error.log');

function appendErrorLog(entry: { timestamp: string; route?: string; method?: string; error: string; stack?: string }) {
  try {
    if (!fs.existsSync(path.dirname(ERROR_LOG_PATH))) {
      fs.mkdirSync(path.dirname(ERROR_LOG_PATH), { recursive: true });
    }
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(ERROR_LOG_PATH, line, 'utf-8');
  } catch {
    // swallow – avoid recursive errors
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(versionInterceptor);

interface EventRow {
  id: number;
  projectId: string;
  namespace: string;
  stage: string;
  isError: number;
  eventData: string;
  eventDate: string;
  [key: string]: unknown;
}

interface GetLastEventsBody {
  dateRange?: { startDate?: string; endDate?: string };
  projectId?: string;
  limit?: number;
}

interface GetEventsListBody {
  projectId?: string;
  namespace?: string;
  stage?: string;
  isError?: number | string;
  dateRange?: { startDate?: string; endDate?: string };
  limit?: number;
}

interface AddEventBody {
  projectId?: string;
  namespace?: string;
  stage?: string;
  isError?: boolean;
  eventData?: string;
  eventDate?: string;
}

interface CheckDBRow {
  table_count?: number;
}

// request payload:
// "dateRange": {
//     "startDate": string
//     "endDate": string
//   },
// projectId: string
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
app.post('/get-last-events', async (req: Request, res: Response) => {
  const body = req.body as GetLastEventsBody;
  const { startDate, endDate } = body.dateRange || {};
  const projectId = body.projectId?.split('-')[0];
  const limit = body.limit || 10;

  // Validate required parameters
  if (!startDate || !endDate || !projectId) {
    return res.status(400).json({
      error: 'Missing required parameters: dateRange.startDate, dateRange.endDate, or projectId'
    });
  }

  try {
    const pool = createPool();
    const connection = await pool.getConnection();
    const namespace = body.projectId?.split('-')[1];

    // Validate date format (optional but recommended)
    if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Parameterized query to prevent SQL injection
    const queryParams: (string | number)[] = [projectId, startDate, endDate, limit];
    let sqlQuery = `
      SELECT *
      FROM events
      WHERE projectId = ?
        AND eventDate BETWEEN ? AND ?
      ORDER BY eventDate DESC
      LIMIT ?
    `;

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

    res.status(200).json({ data: rows as EventRow[] });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-last-events', method: 'POST', error: error.message, stack: error.stack });
    console.error('Database error:', error);

    if (error?.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({ error: `Table 'events' doesn't exist` });
    } else if (error?.code === 'ECONNREFUSED') {
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

app.post('/add-event', async (req: Request, res: Response) => {
  const { projectId, namespace, stage, isError, eventData, eventDate } = req.body as AddEventBody;

  // Validate required fields
  if (!projectId || !namespace || !stage) {
    return res.status(400).json({ error: 'projectId, namespace, and stage are required' });
  }

  // Prepare query and values
  const query = 'INSERT INTO events (projectId, namespace, stage, isError, eventData, eventDate) VALUES (?, ?, ?, ?, ?, ?)';
  const values: (string | boolean)[] = [projectId, namespace, stage, isError || false, eventData || '', eventDate || new Date().toISOString()];

  try {
    const pool = createPool();
    const connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    // Release the connection back to the pool
    connection.release();

    // Return the newly inserted event ID
    res.status(201).json({ id: (result as ResultSetHeader).insertId });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/add-event', method: 'POST', error: error.message, stack: error.stack });
    console.log(error);
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table events doesn't exist`);
    } else if (error?.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP();
      res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
    } else {
      res.status(500).send(error?.message);
    }
  }
});

// request payload (all optional):
// {
//   "projectId": string,
//   "namespace": string,
//   "stage": string,
//   "isError": 0 | 1,
//   "dateRange": { "startDate": string, "endDate": string },
//   "limit": number
// }
app.post('/get-events-list', async (req: Request, res: Response) => {
  const body = req.body as GetEventsListBody;
  const { projectId, namespace, stage, isError, dateRange, limit } = body || {};
  const conditions: string[] = [];
  const queryParams: (string | number)[] = [];

  if (projectId) {
    conditions.push('projectId = ?');
    queryParams.push(projectId);
  }
  if (namespace) {
    conditions.push('namespace = ?');
    queryParams.push(namespace);
  }
  if (stage) {
    conditions.push('stage = ?');
    queryParams.push(stage);
  }
  if (isError !== undefined && isError !== null && isError !== '') {
    conditions.push('isError = ?');
    queryParams.push(Number(isError));
  }
  if (dateRange?.startDate && dateRange?.endDate) {
    conditions.push('eventDate BETWEEN ? AND ?');
    queryParams.push(dateRange.startDate, dateRange.endDate);
  }

  let sqlQuery = 'SELECT * FROM events';
  if (conditions.length) {
    sqlQuery += ' WHERE ' + conditions.join(' AND ');
  }
  sqlQuery += ' ORDER BY eventDate DESC';
  if (limit) {
    sqlQuery += ' LIMIT ?';
    queryParams.push(limit);
  }

  try {
    const pool = createPool();
    const connection = await pool.getConnection();
    const [rows] = await connection.query(sqlQuery, queryParams);
    connection.release();

    res.status(200).json({ data: rows as EventRow[] });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-events-list', method: 'POST', error: error.message, stack: error.stack });
    console.error('Database error:', error);
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({ error: `Table 'events' doesn't exist` });
    } else if (error?.code === 'ECONNREFUSED') {
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

app.post('/get-projects-status', async (req: Request, res: Response) => {
  const body = req.body as ProjectStatusBody;
  const limit = body.limit || 5;

  try {
    const pool = createPool();
    const connection = await pool.getConnection();

    // Get all unique projects from events table
    const [projects] = await connection.query(
      'SELECT DISTINCT projectId, namespace FROM events ORDER BY projectId'
    ) as [any[], any];

    const statusResults: ProjectStatusResponse[] = [];

    for (const project of projects) {
      const { projectId, namespace } = project;

      // Get total count and error count
      const [counts] = await connection.query(
        `SELECT 
          COUNT(*) as totalEvents,
          SUM(CASE WHEN isError = 1 THEN 1 ELSE 0 END) as errorCount
        FROM events 
        WHERE projectId = ? AND namespace = ?`,
        [projectId, namespace]
      ) as [any[], any];

      // Get last event date
      const [lastEvent] = await connection.query(
        'SELECT MAX(eventDate) as lastEventDate FROM events WHERE projectId = ? AND namespace = ?',
        [projectId, namespace]
      ) as [any[], any];

      // Get recent events
      const [recentEvents] = await connection.query(
        `SELECT * FROM events 
        WHERE projectId = ? AND namespace = ? 
        ORDER BY eventDate DESC LIMIT ?`,
        [projectId, namespace, limit]
      ) as [any[], any];

      statusResults.push({
        projectId,
        namespace,
        totalEvents: counts[0]?.totalEvents || 0,
        errorCount: counts[0]?.errorCount || 0,
        lastEventDate: lastEvent[0]?.lastEventDate || null,
        recentEvents: recentEvents as EventRow[]
      });
    }

    connection.release();
    res.status(200).json({ data: statusResults });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-projects-status', method: 'POST', error: error.message, stack: error.stack });
    console.error('Database error:', error);
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({ error: `Table 'events' doesn't exist` });
    } else if (error?.code === 'ECONNREFUSED') {
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

app.post('/get-projects', async (req: Request, res: Response) => {
  try {
    const safeRes = await retry(async () => {
      return axios.post(`${process.env.SAFE_URL}/get-entries`, {}, { timeout: 10000 });
    }, { retries: 5 })
    res.status(200).json({ data: safeRes.data });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-projects', method: 'POST', error: error.message, stack: error.stack });
    console.log(`get-projects error: ${error}`)
    res.status(500).send(error?.message);
  }
})

interface ProjectStatusBody {
  projectId?: string;
  limit?: number;
}

interface ProjectStatusResponse {
  projectId: string;
  namespace: string;
  totalEvents: number;
  errorCount: number;
  lastEventDate: string | null;
  recentEvents: EventRow[];
}

interface ProjectEntriesBody {
  projectId?: string;
  namespace?: string;
  projectName?: string;
}

const validateProjectEntriesParams = (body: ProjectEntriesBody) => {
  const { projectId, projectName } = body;
  if (!projectId && !projectName) {
    throw new Error('Either projectId or projectName must be provided');
  }
};

// {
//   "projectName": "stat@github-back"
// }
app.post('/get-project-entries', async (req: Request, res: Response) => {
  try {
    validateProjectEntriesParams(req.body as ProjectEntriesBody)
    const safeRes = await axios.post(`${process.env.SAFE_URL}/get-project-entries`, req.body)

    res.status(200).json(safeRes.data);
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-project-entries', method: 'POST', error: error.message, stack: error.stack });
    console.log(`${error}`)
    res.status(500).send(error?.message);
  }
})

interface RuntimeEventPayload {
  projectId: string;
  namespace: string;
  stage: string;
  eventData: string;
}

async function sendRuntimeEventToStat(triggerIP: string): Promise<boolean> {
  try {
    const payload: RuntimeEventPayload = {
      projectId: `${process.env.PROJECT_ID}@github`,
      namespace: process.env.NAMESPACE as string,
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
  } catch (error: any) {
    console.error('error in sendRuntimeEventToStat...');
    if (axios.isAxiosError(error)) {
      // Handle Axios-specific errors
      const axiosError = error;
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
function shouldRunStat(currentMinute: number): boolean {
  return [1, 15, 30, 45].includes(currentMinute);
}

// Global variable to track the last minute when sendRuntimeEventToStat was called
let lastExecutedMinute: number | null = null;

app.get('/get-updates', async (req: Request, res: Response) => {
  const clientIP = req.ip;

  // Parse URL parameters
  const { stat } = req.query;

  let sendToStatResult = false;

  // Get the current minute
  const now = new Date();
  const currentMinute = now.getMinutes();

  // Check if stat=true is in the URL params
  if (stat === 'true') {
    sendToStatResult = await sendRuntimeEventToStat(clientIP || '');
  } else {
    // If stat is not true, check the current time and whether the function was already called this minute
    if (shouldRunStat(currentMinute) && lastExecutedMinute !== currentMinute) {
      lastExecutedMinute = currentMinute; // Update the last executed minute
      sendToStatResult = await sendRuntimeEventToStat(clientIP || '');
    }
  }

  res.json({
    trigger: clientIP,
    PORT: process.env.PORT,
    isSendToStat: sendToStatResult,
    db: await checkDBConnection(),
  });
});

// Global error handler – logs to back/storage/error.log
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  appendErrorLog({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
  });
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function getPublicIP(): Promise<string | null> {
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
  console.log(`[VERSION] ${getVersion()}`)
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();

export default app;
