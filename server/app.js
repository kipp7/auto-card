const express = require('express');
const fs = require('fs');
const path = require('path');

const { loadEnvFile } = require('./utils/env');
const { apiError } = require('./utils/response');
const { startOrderCleanup } = require('./jobs/order-cleanup');
const { startReconcileMonitor } = require('./jobs/reconcile-monitor');

loadEnvFile();

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.get('/health', (req, res) => {
  res.type('text/plain').send('ok');
});

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
if (fs.existsSync(webDir)) {
  app.use(express.static(webDir));
}

const adminDistDir = path.join(rootDir, 'admin', 'dist');
if (fs.existsSync(adminDistDir)) {
  app.use('/admin', express.static(adminDistDir));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistDir, 'index.html'));
  });
}

app.use('/api', require('./routes'));

app.use((req, res) => {
  if (req.path.startsWith('/api')) return apiError(res, 404, '接口不存在');
  return res.status(404).type('text/plain').send('Not Found');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) return apiError(res, 500, '服务器内部错误');
  return res.status(500).type('text/plain').send('Internal Server Error');
});

if (require.main === module) {
  startOrderCleanup({ intervalSeconds: 60 });
  startReconcileMonitor({ intervalSeconds: 300 });
  app.listen(port, () => {
    console.log(`服务器正在 http://localhost:${port} 运行`);
  });
}

module.exports = app;
