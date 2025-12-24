const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { query, queryOne } = require('../../utils/db');
const { md5 } = require('../../utils/hash');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');

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

function splitCards(raw) {
  if (!raw) return [];
  const lines = String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Array.from(new Set(lines));
}

function collectCardLines(body) {
  if (Array.isArray(body.cards)) {
    return body.cards.map((item) => String(item ?? ''));
  }
  const raw = body.cardsText || body.text || body.cardNumber || '';
  if (!raw) return [];
  return String(raw).split(/\r?\n/);
}

function analyzeCardLines(lines, options = {}) {
  const maxLength = options.maxLength || 500;
  const seen = new Set();
  const valid = [];
  const errors = [];

  for (const raw of lines) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    if (value.length > maxLength) {
      errors.push({ cardNumber: value, reason: '长度超限' });
      continue;
    }
    if (seen.has(value)) {
      errors.push({ cardNumber: value, reason: '批次内重复' });
      continue;
    }
    seen.add(value);
    valid.push(value);
  }

  return { valid, errors };
}

router.get('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const { name, category, status, isRealName, sortBy, sortOrder } = req.query;

  const where = [];
  const params = [];

  if (name) {
    where.push('name LIKE ?');
    params.push(`%${name}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
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
        male_ratio AS maleRatio,
        female_ratio AS femaleRatio,
        main_image AS mainImage,
        screenshot,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'available') AS stockAvailable,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'reserved') AS stockReserved,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'sold') AS stockSold,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id) AS stockTotal,
        status,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN 1 ELSE 0
        END AS promoActive,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
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
    stockReserved: Number(row.stockReserved) || 0,
    stockSold: Number(row.stockSold) || 0,
    stockTotal: Number(row.stockTotal) || 0,
  }));

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
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
        male_ratio AS maleRatio,
        female_ratio AS femaleRatio,
        card_number AS cardNumber,
        description,
        detailed_intro AS detailedIntro,
        usage_instructions AS usageInstructions,
        main_image AS mainImage,
        screenshot,
        gallery_images AS galleryImages,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'available') AS stockAvailable,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'reserved') AS stockReserved,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id AND pc.status = 'sold') AS stockSold,
        (SELECT COUNT(*) FROM product_cards pc WHERE pc.product_id = products.id) AS stockTotal,
        status,
        CASE
          WHEN promo_price IS NOT NULL
            AND (promo_start_at IS NULL OR promo_start_at <= NOW())
            AND (promo_end_at IS NULL OR promo_end_at >= NOW())
          THEN 1 ELSE 0
        END AS promoActive,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!row) return apiError(res, 404, '商品不存在');

  return apiSuccess(res, {
    ...row,
    isRealName: Boolean(row.isRealName),
    promoActive: Boolean(row.promoActive),
    galleryImages: parseJsonArray(row.galleryImages),
    stockAvailable: Number(row.stockAvailable) || 0,
    stockReserved: Number(row.stockReserved) || 0,
    stockSold: Number(row.stockSold) || 0,
    stockTotal: Number(row.stockTotal) || 0,
  });
}));

router.get('/:id/stock', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const productId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(productId)) return apiError(res, 400, '非法商品ID');

  const product = await queryOne('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
  if (!product) return apiError(res, 404, '商品不存在');

  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 20, maxPageSize: 100 });
  const { status, keyword } = req.query;

  const where = ['product_id = ?'];
  const params = [productId];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  if (keyword) {
    where.push('card_number LIKE ?');
    params.push(`%${keyword}%`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM product_cards ${whereSql}`, params);

  const list = await query(
    `
      SELECT
        id,
        card_number AS cardNumber,
        status,
        reserved_order_id AS reservedOrderId,
        sold_order_id AS soldOrderId,
        DATE_FORMAT(reserved_at, '%Y-%m-%d %H:%i:%s') AS reservedAt,
        DATE_FORMAT(sold_at, '%Y-%m-%d %H:%i:%s') AS soldAt,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM product_cards
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.post('/:id/stock/import', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const productId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(productId)) return apiError(res, 400, '非法商品ID');

  const product = await queryOne('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
  if (!product) return apiError(res, 404, '商品不存在');

  const body = req.body || {};
  const { valid, errors } = analyzeCardLines(collectCardLines(body));
  if (!valid.length) return apiError(res, 400, '未检测到可导入的卡密');

  const max = 5000;
  const overLimit = valid.length > max ? valid.slice(max) : [];
  const batch = valid.slice(0, max);

  const hashList = batch.map((card) => md5(card));
  const existingHashes = new Set();
  const chunkSize = 800;
  for (let i = 0; i < hashList.length; i += chunkSize) {
    const chunk = hashList.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await query(
      `SELECT card_hash AS cardHash FROM product_cards WHERE product_id = ? AND card_hash IN (${placeholders})`,
      [productId, ...chunk],
    );
    rows.forEach((row) => existingHashes.add(row.cardHash));
  }

  const ready = [];
  const existed = [];
  batch.forEach((card, index) => {
    const hash = hashList[index];
    if (existingHashes.has(hash)) {
      existed.push(card);
      errors.push({ cardNumber: card, reason: '已存在' });
      return;
    }
    ready.push({ card, hash });
  });

  for (const card of overLimit) {
    errors.push({ cardNumber: card, reason: '超出单次上限' });
  }

  let inserted = 0;
  if (ready.length) {
    const placeholders = ready.map(() => '(?,?,?,?)').join(',');
    const params = [];
    for (const item of ready) {
      params.push(productId, item.card, item.hash, 'available');
    }

    const result = await query(
      `
        INSERT IGNORE INTO product_cards (product_id, card_number, card_hash, status)
        VALUES ${placeholders}
      `,
      params,
    );
    inserted = Number(result.affectedRows) || 0;
  }

  const stats = await queryOne(
    `
      SELECT
        (SELECT COUNT(*) FROM product_cards WHERE product_id = ? AND status = 'available') AS stockAvailable,
        (SELECT COUNT(*) FROM product_cards WHERE product_id = ? AND status = 'reserved') AS stockReserved,
        (SELECT COUNT(*) FROM product_cards WHERE product_id = ? AND status = 'sold') AS stockSold,
        (SELECT COUNT(*) FROM product_cards WHERE product_id = ?) AS stockTotal
    `,
    [productId, productId, productId, productId],
  );

  return apiSuccess(
    res,
    {
      attempted: batch.length,
      inserted,
      skipped: errors.length,
      summary: {
        invalid: errors.filter((item) => item.reason === '长度超限').length,
        duplicate: errors.filter((item) => item.reason === '批次内重复').length,
        existed: existed.length,
        overLimit: overLimit.length,
      },
      errors,
      stock: {
        stockAvailable: Number(stats.stockAvailable) || 0,
        stockReserved: Number(stats.stockReserved) || 0,
        stockSold: Number(stats.stockSold) || 0,
        stockTotal: Number(stats.stockTotal) || 0,
      },
    },
    '导入成功',
  );
}));

router.delete('/:id/stock/:cardId', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const productId = Number.parseInt(req.params.id, 10);
  const cardId = Number.parseInt(req.params.cardId, 10);
  if (Number.isNaN(productId)) return apiError(res, 400, '非法商品ID');
  if (Number.isNaN(cardId)) return apiError(res, 400, '非法卡密ID');

  const row = await queryOne('SELECT id, status FROM product_cards WHERE id = ? AND product_id = ? LIMIT 1', [cardId, productId]);
  if (!row) return apiError(res, 404, '卡密不存在');
  if (row.status !== 'available') return apiError(res, 409, '仅可删除未售出的卡密');

  const result = await query('DELETE FROM product_cards WHERE id = ? AND product_id = ? AND status = ?', [cardId, productId, 'available']);
  if (!result.affectedRows) return apiError(res, 409, '删除失败，请刷新后重试');
  return apiSuccess(res, null, '删除成功');
}));

router.post('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { name, category, price } = body;
  if (!name || !category || price === undefined || price === null) return apiError(res, 400, 'name/category/price 必填');

  const galleryImages = Array.isArray(body.galleryImages) ? body.galleryImages : null;
  const result = await query(
    `
      INSERT INTO products (
        name,
        category,
        price,
        original_price,
        followers,
        likes,
        promo_price,
        promo_start_at,
        promo_end_at,
        is_real_name,
        male_ratio,
        female_ratio,
        card_number,
        description,
        detailed_intro,
        usage_instructions,
        main_image,
        screenshot,
        gallery_images,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      body.name,
      body.category,
      body.price,
      body.originalPrice ?? null,
      body.followers ?? 0,
      body.likes ?? 0,
      body.promoPrice ?? null,
      body.promoStartAt ?? null,
      body.promoEndAt ?? null,
      body.isRealName ? 1 : 0,
      body.maleRatio ?? 50,
      body.femaleRatio ?? 50,
      body.cardNumber ?? null,
      body.description ?? null,
      body.detailedIntro ?? null,
      body.usageInstructions ?? null,
      body.mainImage ?? null,
      body.screenshot ?? null,
      galleryImages ? JSON.stringify(galleryImages) : null,
      body.status || 'online',
    ],
  );

  const imported = splitCards(body.cardNumber);
  if (imported.length) {
    const placeholders = imported.map(() => '(?,?,?,?)').join(',');
    const params = [];
    for (const card of imported.slice(0, 5000)) {
      params.push(result.insertId, card, md5(card), 'available');
    }
    await query(
      `
        INSERT IGNORE INTO product_cards (product_id, card_number, card_hash, status)
        VALUES ${placeholders}
      `,
      params,
    );
  }

  return apiSuccess(res, { id: result.insertId }, '创建成功');
}));

router.put('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法商品ID');

  const body = req.body || {};
  const fields = [];
  const params = [];

  const map = [
    ['name', 'name'],
    ['category', 'category'],
    ['price', 'price'],
    ['originalPrice', 'original_price'],
    ['followers', 'followers'],
    ['likes', 'likes'],
    ['promoPrice', 'promo_price'],
    ['promoStartAt', 'promo_start_at'],
    ['promoEndAt', 'promo_end_at'],
    ['description', 'description'],
    ['mainImage', 'main_image'],
    ['screenshot', 'screenshot'],
    ['detailedIntro', 'detailed_intro'],
    ['usageInstructions', 'usage_instructions'],
    ['maleRatio', 'male_ratio'],
    ['femaleRatio', 'female_ratio'],
    ['cardNumber', 'card_number'],
    ['status', 'status'],
  ];

  for (const [key, column] of map) {
    if (body[key] === undefined) continue;
    fields.push(`${column} = ?`);
    params.push(body[key]);
  }

  if (body.isRealName !== undefined) {
    fields.push('is_real_name = ?');
    params.push(body.isRealName ? 1 : 0);
  }

  if (body.galleryImages !== undefined) {
    fields.push('gallery_images = ?');
    params.push(body.galleryImages ? JSON.stringify(body.galleryImages) : null);
  }

  if (!fields.length) return apiError(res, 400, '无可更新字段');
  params.push(id);

  const result = await query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  if (!result.affectedRows) return apiError(res, 404, '商品不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.patch('/:id/status', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法商品ID');

  const { status } = req.body || {};
  if (!status) return apiError(res, 400, 'status 必填');

  const result = await query('UPDATE products SET status = ? WHERE id = ?', [status, id]);
  if (!result.affectedRows) return apiError(res, 404, '商品不存在');
  return apiSuccess(res, null, '更新成功');
}));

router.delete('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return apiError(res, 400, '非法商品ID');

  const orderCount = await queryOne('SELECT COUNT(*) AS total FROM orders WHERE product_id = ?', [id]);
  if (orderCount && orderCount.total > 0) {
    return apiError(res, 409, '该商品已有订单记录，无法删除');
  }

  await query('DELETE FROM product_cards WHERE product_id = ?', [id]);

  const result = await query('DELETE FROM products WHERE id = ?', [id]);
  if (!result.affectedRows) return apiError(res, 404, '商品不存在');
  return apiSuccess(res, null, '删除成功');
}));

module.exports = router;
