const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { query, queryOne } = require('../../utils/db');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');

const router = express.Router();

function getAnnouncementSort(sortBy, sortOrder) {
  const columns = {
    sort: 'sort',
    createdAt: 'created_at',
  };
  const column = columns[sortBy] || 'sort';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { column, order };
}

router.get('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const { title, status, sortBy, sortOrder } = req.query;

  const where = [];
  const params = [];

  if (title) {
    where.push('title LIKE ?');
    params.push(`%${title}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await queryOne(
    `SELECT COUNT(*) AS total FROM announcements ${whereSql}`,
    params,
  );

  const { column, order } = getAnnouncementSort(sortBy, sortOrder);
  const list = await query(
    `
      SELECT
        id,
        title,
        content,
        status,
        sort,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM announcements
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
  if (Number.isNaN(id)) return apiError(res, 400, '非法公告ID');

  const row = await queryOne(
    `
      SELECT
        id,
        title,
        content,
        status,
        sort,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM announcements
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!row) return apiError(res, 404, '公告不存在');
  return apiSuccess(res, row);
}));

router.post('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { title, content, status, sort } = req.body || {};
  if (!title || !content) return apiError(res, 400, 'title/content 必填');

  const result = await query(
    'INSERT INTO announcements (title, content, status, sort) VALUES (?, ?, ?, ?)',
    [title, content, status || 'published', sort ?? 0],
  );

  return apiSuccess(res, { id: result.insertId }, '创建成功');
}));

router.put('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法公告ID');

  const body = req.body || {};
  const fields = [];
  const params = [];

  const map = [
    ['title', 'title'],
    ['content', 'content'],
    ['status', 'status'],
    ['sort', 'sort'],
  ];

  for (const [key, column] of map) {
    if (body[key] === undefined) continue;
    fields.push(`${column} = ?`);
    params.push(body[key]);
  }

  if (!fields.length) return apiError(res, 400, '无可更新字段');
  params.push(id);

  const result = await query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, params);
  if (!result.affectedRows) return apiError(res, 404, '公告不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.patch('/:id/status', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法公告ID');

  const { status } = req.body || {};
  if (!status) return apiError(res, 400, 'status 必填');

  const result = await query('UPDATE announcements SET status = ? WHERE id = ?', [status, id]);
  if (!result.affectedRows) return apiError(res, 404, '公告不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.delete('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法公告ID');

  const result = await query('DELETE FROM announcements WHERE id = ?', [id]);
  if (!result.affectedRows) return apiError(res, 404, '公告不存在');
  return apiSuccess(res, null, '删除成功');
}));

module.exports = router;
