const express = require('express');

const { query, queryOne } = require('../../utils/db');
const { parsePagination } = require('../../utils/pagination');
const { apiSuccess } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/async-handler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 10, maxPageSize: 50 });

  const totalRow = await queryOne(
    "SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'",
    [],
  );

  const list = await query(
    `
      SELECT
        id,
        title,
        content,
        status,
        sort,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM announcements
      WHERE status = 'published'
      ORDER BY sort DESC, created_at DESC
      LIMIT ? OFFSET ?
    `,
    [pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

module.exports = router;
