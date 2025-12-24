const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { query, queryOne } = require('../../utils/db');
const { md5 } = require('../../utils/hash');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');

const router = express.Router();

function getUserSort(sortBy, sortOrder) {
  const columns = {
    createdAt: 'created_at',
    username: 'username',
  };
  const column = columns[sortBy] || 'created_at';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { column, order };
}

router.get('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const { username, type, status, sortBy, sortOrder } = req.query;

  const where = [];
  const params = [];

  if (username) {
    where.push('username LIKE ?');
    params.push(`%${username}%`);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);

  const { column, order } = getUserSort(sortBy, sortOrder);
  const list = await query(
    `
      SELECT
        id,
        username,
        type,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM users
      ${whereSql}
      ORDER BY ${column} ${order}
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法用户ID');

  const user = await queryOne(
    `
      SELECT
        id,
        username,
        type,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!user) return apiError(res, 404, '用户不存在');
  return apiSuccess(res, user);
}));

router.put('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法用户ID');

  const { status, password } = req.body || {};
  if (!status && !password) return apiError(res, 400, '无可更新字段');

  const fields = [];
  const params = [];
  if (status) {
    fields.push('status = ?');
    params.push(status);
  }
  if (password) {
    fields.push('password = ?');
    params.push(md5(password));
  }
  params.push(id);

  const result = await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  if (!result.affectedRows) return apiError(res, 404, '用户不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.patch('/:id/status', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法用户ID');

  const { status } = req.body || {};
  if (!status) return apiError(res, 400, 'status 必填');

  const result = await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  if (!result.affectedRows) return apiError(res, 404, '用户不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.delete('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法用户ID');

  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  if (!result.affectedRows) return apiError(res, 404, '用户不存在');
  return apiSuccess(res, null, '删除成功');
}));

module.exports = router;
