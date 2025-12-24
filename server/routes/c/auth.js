const express = require('express');

const { query, queryOne } = require('../../utils/db');
const { md5 } = require('../../utils/hash');
const { signJwt } = require('../../utils/jwt');
const { apiError, apiSuccess } = require('../../utils/response');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');

const router = express.Router();

function getJwtExpiresInSeconds() {
  const parsed = Number.parseInt(process.env.JWT_EXPIRES_IN || '604800', 10);
  return Number.isNaN(parsed) ? 604800 : parsed;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

router.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return apiError(res, 400, '用户名和密码必填');

  const existed = await queryOne('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (existed) return apiError(res, 400, '用户名已存在', 1001);

  const result = await query(
    'INSERT INTO users (username, password, type, status) VALUES (?, ?, ?, ?)',
    [username, md5(password), 'mobile', 'enabled'],
  );

  const userId = result.insertId;
  const token = signJwt(
    { id: userId, username, type: 'mobile' },
    getJwtSecret(),
    getJwtExpiresInSeconds(),
  );

  return apiSuccess(res, { userId, username, token }, '注册成功');
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return apiError(res, 400, '用户名和密码必填');

  const user = await queryOne(
    'SELECT id, username, password, status FROM users WHERE username = ? AND type = ? LIMIT 1',
    [username, 'mobile'],
  );

  if (!user) return apiError(res, 401, '用户名或密码错误');
  if (user.status !== 'enabled') return apiError(res, 403, '账号已被禁用');
  if (user.password !== md5(password)) return apiError(res, 401, '用户名或密码错误');

  const token = signJwt(
    { id: user.id, username: user.username, type: 'mobile' },
    getJwtSecret(),
    getJwtExpiresInSeconds(),
  );

  return apiSuccess(res, { userId: user.id, username: user.username, token }, '登录成功');
}));

router.get('/me', requireAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  apiSuccess(res, { userId: req.user.id, username: req.user.username });
}));

module.exports = router;
