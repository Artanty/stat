const mysql = require('mysql2/promise');
require('dotenv').config();

let pool

function createPool () {
  console.log(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_HOST)
  if (!pool) {
    console.log('Creatig DB pool...')
    const thisPool = mysql.createPool({
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 30000,
    });
    pool = thisPool
  }
  return pool
}

module.exports = createPool;