const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('后端服务已成功运行!');
});

app.listen(port, () => {
  console.log(`服务器正在 http://localhost:${port} 运行`);
});
