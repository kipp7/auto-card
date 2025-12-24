const mysql = require('mysql2/promise');

function normalizeParams(params) {
  if (!params) return [];
  if (Array.isArray(params)) return params.map((value) => (value === undefined ? null : value));

  if (typeof params === 'object') {
    const next = {};
    for (const [key, value] of Object.entries(params)) {
      next[key] = value === undefined ? null : value;
    }
    return next;
  }

  return [params];
}

let pool;

function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().query(sql, normalizeParams(params));
  return rows;
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = {
  query,
  queryOne,
  getPool,
};
