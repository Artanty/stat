import createPool from './db_connection.js';

export interface DBCheckResult {
  connected: boolean;
  tableCount?: number;
  database?: string;
  error?: string;
}

async function checkDBConnection(): Promise<DBCheckResult> {
  console.log('Checking DB connection...')
  console.log('database: ' + process.env.DB_DATABASE)
  try {
    const pool = createPool()
    const [rows] = await pool.query(`SELECT COUNT(*) AS table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "${process.env.DB_DATABASE}";`);
    const count = (rows as { table_count?: number }[])[0]?.table_count;
    console.log(`Database ${process.env.DB_DATABASE} with ${count} tables is successfully connected.`);
    return { connected: true, tableCount: count, database: process.env.DB_DATABASE };
  } catch (error: any) {
    console.log('DB connection error: ')
    console.log(error)
    return { connected: false, database: process.env.DB_DATABASE, error: error.message };
  }
}

export default checkDBConnection;
