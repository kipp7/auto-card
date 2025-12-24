const express = require('express');

const { query, queryOne } = require('../../utils/db');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/async-handler');

const router = express.Router();

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getProductSort(sortBy, sortOrder) {
  const columns = {
    price: 'price',
    followers: 'followers',
    likes: 'likes',
    createdAt: 'created_at',
  };
  const column = columns[sortBy] || 'created_at';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { column, order };
}

router.get('/', asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 20, maxPageSize: 50 });
  const { keyword, category, status, isRealName, sortBy, sortOrder } = req.query;

  const where = [];
  const params = [];

  if (keyword) {
    where.push('name LIKE ?');
    params.push(`%${keyword}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }

  const statusValue = status || 'online';
  if (statusValue) {
    where.push('status = ?');
    params.push(statusValue);
  }

  const isRealNameBool = parseBoolean(isRealName);
  if (isRealNameBool !== null) {
    where.push('is_real_name = ?');
    params.push(isRealNameBool ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM products ${whereSql}`, params);
  const { column, order } = getProductSort(sortBy, sortOrder);

  const rows = await query(
    `
      SELECT
        id,
        name,
        category,
        price,
        original_price AS originalPrice,
        promo_price AS promoPrice,
        DATE_FORMAT(promo_start_at, '%Y-%m-%d %H:%i:%s') AS promoStartAt,
        DATE_FORMAT(promo_end_at, '%Y-%m-%d %H:%i:%s') AS promoEndAt,
        followers,
        likes,
        is_real_name AS isRealName,
        main_image AS mainImage,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'available') AS stockAvailable,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id) AS stockTotal,
        status,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN promo_price ELSE price
        END AS salePrice,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN 1 ELSE 0
        END AS promoActive,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM products
      ${whereSql}
      ORDER BY ${column} ${order}
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  const list = rows.map((row) => ({
    ...row,
    isRealName: Boolean(row.isRealName),
    promoActive: Boolean(row.promoActive),
    stockAvailable: Number(row.stockAvailable) || 0,
    stockTotal: Number(row.stockTotal) || 0,
    isSoldOut: Number(row.stockAvailable) <= 0,
  }));

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法商品ID');

  const row = await queryOne(
    `
      SELECT
        id,
        name,
        category,
        price,
        original_price AS originalPrice,
        promo_price AS promoPrice,
        DATE_FORMAT(promo_start_at, '%Y-%m-%d %H:%i:%s') AS promoStartAt,
        DATE_FORMAT(promo_end_at, '%Y-%m-%d %H:%i:%s') AS promoEndAt,
        followers,
        likes,
        is_real_name AS isRealName,
        description,
        detailed_intro AS detailedIntro,
        usage_instructions AS usageInstructions,
        main_image AS mainImage,
        screenshot,
        gallery_images AS galleryImages,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'available') AS stockAvailable,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id) AS stockTotal,
        status,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN promo_price ELSE price
        END AS salePrice,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN 1 ELSE 0
        END AS promoActive,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!row) return apiError(res, 404, '商品不存在');
  if (row.status !== 'online') return apiError(res, 404, '商品不存在');

  return apiSuccess(res, {
    ...row,
    isRealName: Boolean(row.isRealName),
    promoActive: Boolean(row.promoActive),
    galleryImages: parseJsonArray(row.galleryImages),
    stockAvailable: Number(row.stockAvailable) || 0,
    stockTotal: Number(row.stockTotal) || 0,
    isSoldOut: Number(row.stockAvailable) <= 0,
  });
}));

module.exports = router;
