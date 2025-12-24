const mysql = require('mysql2/promise');

const { loadEnvFile } = require('../utils/env');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDb({ retries = 30, intervalMs = 2000 } = {}) {
  loadEnvFile();

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || undefined;

  for (let i = 0; i < retries; i += 1) {
    try {
      const connection = await mysql.createConnection({ host, port, user, password, database });
      await connection.end();
      console.log('数据库连接已就绪');
      return;
    } catch (err) {
      const left = retries - i - 1;
      console.log(`等待数据库启动... (${left} 次重试剩余)`);
      await sleep(intervalMs);
    }
  }

  throw new Error('等待数据库超时');
}

waitForDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
