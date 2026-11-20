import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ResultSetHeader } from 'mysql2/promise';
import createPool from './core/db_connection.js';
import checkDBConnection from './core/db_check_connection.js';
import ensureDeployColumns from './core/ensure_deploy_columns.js';
import getVersion from './core/get_version.js';
import { fetchDeployRuns, type GetDeployRunsQuery as GetDeployRunsBody } from './core/deployRuns.js';
import { buildMiniEnvelope } from './core/miniEnvelope.js';
import versionInterceptor from './middleware/versionInterceptor.js';
import { mountBackendFeatures } from './features/loader.js';

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

// feat backend-slots (spec: feat/back/spec/backend-slots.md): mount whatever the deploy
// config says — env rows FEAT_<ID>_MOUNT=<path> decide which vendored features/ modules
// are attached (e.g. FEAT_REQ_MOUNT=/req + FEAT_REQ_<NAME>_* recipe rows). The app knows
// only this slot call, never a feature.
await mountBackendFeatures(app);

interface AddEventBody {
  projectId?: string;
  namespace?: string;
  stage?: string;
  isError?: boolean;
  eventData?: string;
  eventDate?: string;
  workflow?: string;
  workflowRunId?: string;
  commitMessage?: string;
  steps?: string | string[];
}

// telemetry ingestion — serf master/slave workflows POST their deploy events here
app.post('/add-event', async (req: Request, res: Response) => {
  const { projectId, namespace, stage, isError, eventData, eventDate, workflow, workflowRunId, commitMessage, steps } = req.body as AddEventBody;

  // Validate required fields
  if (!projectId || !namespace || !stage) {
    return res.status(400).json({ error: 'projectId, namespace, and stage are required' });
  }

  // Base columns always present; deploy-telemetry columns only when provided
  const columns = ['projectId', 'namespace', 'stage', 'isError', 'eventData', 'eventDate'];
  const values: (string | boolean)[] = [projectId, namespace, stage, isError || false, eventData || '', eventDate || new Date().toISOString()];
  // workflows send steps as a JSON array ("[]") or a JSON array string — store the string form
  const stepsValue = Array.isArray(steps) ? JSON.stringify(steps) : steps;
  const extras: [string, string | undefined][] = [
    ['workflow', workflow],
    ['workflowRunId', workflowRunId],
    ['commitMessage', commitMessage],
    ['steps', stepsValue],
  ];
  for (const [column, value] of extras) {
    // empty string = field absent (e.g. slave .env without WORKFLOW_RUN_ID) — keep it NULL
    if (value !== undefined && value !== null && value !== '') {
      columns.push(column);
      values.push(value);
    }
  }
  const query = `INSERT INTO events (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

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
//   "workflowRunId": string,
//   "dateRange": { "startDate": string, "endDate": string },
//   "limit": number   // max runs returned, default 50
// }
// groups deploy events by workflowRunId into run objects (master/slave stages map)
app.post('/get-deploy-runs', async (req: Request, res: Response) => {
  const body = req.body as GetDeployRunsBody;

  try {
    const pool = createPool();
    const runs = await fetchDeployRuns(pool, body);
    res.json({ data: runs });
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/get-deploy-runs', method: 'POST', error: error.message, stack: error.stack });
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

// SDUI remote for the ext side-panel host: the /mini widget as a DivKit envelope,
// latest run only, data baked in server-side (DivKit cards are pure data, no JS)
app.get('/mini/envelope.json', async (_req: Request, res: Response) => {
  try {
    const pool = createPool();
    const runs = await fetchDeployRuns(pool, { limit: 50 });
    res.set('Cache-Control', 'no-cache');
    res.json(buildMiniEnvelope(runs[0] ?? null));
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: '/mini/envelope.json', method: 'GET', error: error.message, stack: error.stack });
    console.log(error);
    res.status(500).json({ error: error?.message });
  }
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
  try {
    const added = await ensureDeployColumns();
    if (added.length) console.log(`[ensure_deploy_columns] added: ${added.join(', ')}`);
  } catch (error: any) {
    appendErrorLog({ timestamp: new Date().toISOString(), route: 'ensure_deploy_columns', method: 'startup', error: error.message, stack: error.stack });
    console.log(`[ensure_deploy_columns] failed: ${error.message}`);
  }
  await checkDBConnection();
  console.log(`[VERSION] ${getVersion()}`)
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();

export default app;
