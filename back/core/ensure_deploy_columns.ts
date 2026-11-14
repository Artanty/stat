import createPool from './db_connection.js';

// events table has no migration system — the deploy-telemetry columns are added
// lazily at startup so the schema converges without manual SQL.
const DEPLOY_COLUMNS: { column: string; definition: string }[] = [
  { column: 'workflowRunId', definition: 'VARCHAR(64) NULL' },
  { column: 'workflow', definition: 'VARCHAR(16) NULL' },
  { column: 'commitMessage', definition: 'VARCHAR(512) NULL' },
  { column: 'steps', definition: 'TEXT NULL' },
];

export default async function ensureDeployColumns(): Promise<string[]> {
  const pool = createPool();
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['events']
  );
  const existing = new Set((rows as { column_name: string }[]).map((r) => r.column_name));
  const added: string[] = [];
  for (const { column, definition } of DEPLOY_COLUMNS) {
    if (!existing.has(column)) {
      await pool.query(`ALTER TABLE events ADD COLUMN ${column} ${definition}`);
      added.push(column);
    }
  }
  return added;
}
