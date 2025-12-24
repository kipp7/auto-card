const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { query, queryOne, getPool } = require('../../utils/db');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');
const { getReconcileSnapshot, refreshReconcileSnapshot } = require('../../jobs/reconcile-monitor');

const router = express.Router();

function getOrderSort(sortBy, sortOrder) {
  const columns = {
    createdAt: 'created_at',
    orderAmount: 'order_amount',
  };
  const column = columns[sortBy] || 'created_at';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { column, order };
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

async function releaseReservedCard(cardId, orderId) {
  if (!cardId) return;
  await query(
    `
      UPDATE product_cards
      SET
        status = 'available',
        reserved_order_id = NULL,
        reserved_at = NULL
      WHERE id = ?
        AND status = 'reserved'
        AND reserved_order_id = ?
    `,
    [cardId, orderId],
  );
}

function buildOrderWhere(query) {
  const {
    orderNo,
    buyerPhone,
    productName,
    status,
    payStatus,
    refundStatus,
    paymentMethod,
    startDate,
    endDate,
  } = query;

  const where = [];
  const params = [];

  if (orderNo) {
    where.push('order_no LIKE ?');
    params.push(`%${orderNo}%`);
  }
  if (buyerPhone) {
    where.push('buyer_phone = ?');
    params.push(buyerPhone);
  }
  if (productName) {
    where.push('product_name LIKE ?');
    params.push(`%${productName}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (payStatus) {
    where.push('pay_status = ?');
    params.push(payStatus);
  }
  if (refundStatus) {
    where.push('refund_status = ?');
    params.push(refundStatus);
  }
  if (paymentMethod) {
    where.push('payment_method = ?');
    params.push(paymentMethod);
  }

  if (startDate) {
    if (!isDateString(startDate)) {
      return { error: 'startDate 格式错误' };
    }
    where.push('created_at >= ?');
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    if (!isDateString(endDate)) {
      return { error: 'endDate 格式错误' };
    }
    where.push('created_at <= ?');
    params.push(`${endDate} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, params };
}

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function repairPaidOrderInternal(orderId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
        SELECT
          id,
          product_id AS productId,
          card_id AS cardId,
          card_number AS cardNumber,
          status,
          pay_status AS payStatus
        FROM orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderId],
    );
    const orderRow = orderRows && orderRows.length ? orderRows[0] : null;
    if (!orderRow) {
      throw createHttpError(404, '订单不存在');
    }
    if (orderRow.payStatus !== 'paid') {
      throw createHttpError(409, '订单未支付');
    }
    if (orderRow.status === 'cancelled') {
      throw createHttpError(409, '订单已取消');
    }

    const orderProductId = orderRow.productId;
    let cardId = orderRow.cardId;
    let cardNumber = orderRow.cardNumber ? String(orderRow.cardNumber) : '';
    let selectedCard = null;
    let conflict = false;

    if (cardId) {
      const [cardRows] = await connection.query(
        `
          SELECT
            id,
            product_id AS productId,
            card_number AS cardNumber,
            status,
            reserved_order_id AS reservedOrderId,
            sold_order_id AS soldOrderId
          FROM product_cards
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [cardId],
      );
      selectedCard = cardRows && cardRows.length ? cardRows[0] : null;
      if (!selectedCard || Number(selectedCard.productId) !== Number(orderProductId)) {
        conflict = true;
      } else if (selectedCard.status === 'sold') {
        if (selectedCard.soldOrderId !== null && Number(selectedCard.soldOrderId) !== Number(orderId)) {
          conflict = true;
        } else {
          cardNumber = selectedCard.cardNumber;
        }
      } else if (selectedCard.status === 'reserved') {
        if (Number(selectedCard.reservedOrderId) !== Number(orderId)) {
          conflict = true;
        } else {
          cardNumber = selectedCard.cardNumber;
        }
      } else if (selectedCard.status === 'available') {
        cardNumber = selectedCard.cardNumber;
      } else {
        conflict = true;
      }
    }

    if ((conflict || !cardId) && cardNumber) {
      const [cardRows] = await connection.query(
        `
          SELECT
            id,
            product_id AS productId,
            card_number AS cardNumber,
            status,
            reserved_order_id AS reservedOrderId,
            sold_order_id AS soldOrderId
          FROM product_cards
          WHERE product_id = ?
            AND card_number = ?
          LIMIT 1
          FOR UPDATE
        `,
        [orderProductId, cardNumber],
      );
      const card = cardRows && cardRows.length ? cardRows[0] : null;
      if (card) {
        if (card.status === 'sold' && card.soldOrderId !== null && Number(card.soldOrderId) !== Number(orderId)) {
          throw createHttpError(409, '卡密已售出');
        }
        if (card.status === 'reserved' && Number(card.reservedOrderId) !== Number(orderId)) {
          throw createHttpError(409, '卡密已被占用');
        }
        selectedCard = card;
        cardId = card.id;
        cardNumber = card.cardNumber;
        conflict = false;
      } else {
        cardNumber = '';
      }
    }

    if (conflict || !cardId) {
      const [cardRows] = await connection.query(
        `
          SELECT id, card_number AS cardNumber
          FROM product_cards
          WHERE product_id = ?
            AND status = 'available'
          ORDER BY id ASC
          LIMIT 1
          FOR UPDATE
        `,
        [orderProductId],
      );
      const card = cardRows && cardRows.length ? cardRows[0] : null;
      if (!card) {
        throw createHttpError(409, '库存不足');
      }
      selectedCard = {
        id: card.id,
        cardNumber: card.cardNumber,
        status: 'available',
        reservedOrderId: null,
        soldOrderId: null,
      };
      cardId = card.id;
      cardNumber = card.cardNumber;
    }

    const [orderUpdate] = await connection.query(
      `
        UPDATE orders
        SET
          card_id = ?,
          card_number = ?,
          status = 'completed',
          pay_status = 'paid',
          paid_at = IFNULL(paid_at, NOW()),
          delivered_at = IFNULL(delivered_at, NOW())
        WHERE id = ?
      `,
      [cardId, cardNumber, orderId],
    );
    if (!orderUpdate.affectedRows) {
      throw createHttpError(409, '订单状态已变化，请刷新后重试');
    }

    const needsCardUpdate =
      !(selectedCard && selectedCard.status === 'sold' && Number(selectedCard.soldOrderId) === Number(orderId));
    if (needsCardUpdate) {
      const [cardUpdate] = await connection.query(
        `
          UPDATE product_cards
          SET
            status = 'sold',
            sold_order_id = ?,
            sold_at = IFNULL(sold_at, NOW()),
            reserved_order_id = NULL,
            reserved_at = NULL
          WHERE id = ?
            AND (
              status IN ('available', 'reserved')
              OR (status = 'sold' AND (sold_order_id = ? OR sold_order_id IS NULL))
            )
        `,
        [orderId, cardId, orderId],
      );
      if (!cardUpdate.affectedRows) {
        throw createHttpError(409, '库存异常，请联系管理员');
      }
    }

    await connection.commit();
    return { status: 'repaired', message: '修复成功', cardNumber };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // ignore
    }
    throw err;
  } finally {
    connection.release();
  }
}

async function deliverOrderInternal(orderId, inputCardNumber) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
        SELECT
          id,
          product_id AS productId,
          card_id AS cardId,
          status,
          pay_status AS payStatus
        FROM orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderId],
    );
    const orderRow = orderRows && orderRows.length ? orderRows[0] : null;
    if (!orderRow) {
      throw createHttpError(404, '订单不存在');
    }

    if (orderRow.payStatus === 'paid') {
      if (orderRow.cardId) {
        await connection.query(
          `
            UPDATE product_cards
            SET
              status = 'sold',
              sold_order_id = ?,
              sold_at = IFNULL(sold_at, NOW()),
              reserved_order_id = NULL,
              reserved_at = NULL
            WHERE id = ?
              AND status IN ('reserved', 'available')
              AND (reserved_order_id IS NULL OR reserved_order_id = ?)
          `,
          [orderId, orderRow.cardId, orderId],
        );
      }
      await connection.commit();
      return { status: 'already_paid', message: '订单已完成' };
    }

    if (orderRow.status === 'cancelled') {
      throw createHttpError(409, '订单已取消');
    }

    let cardId = orderRow.cardId;
    let cardNumber = inputCardNumber;

    if (cardId) {
      const [cardRows] = await connection.query(
        `
          SELECT id, card_number AS cardNumber, status, reserved_order_id AS reservedOrderId
          FROM product_cards
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [cardId],
      );
      const card = cardRows && cardRows.length ? cardRows[0] : null;
      if (!card || card.status === 'sold') {
        throw createHttpError(409, '库存异常，请联系管理员');
      }
      if (card.status === 'reserved' && Number(card.reservedOrderId) !== Number(orderId)) {
        throw createHttpError(409, '订单状态已变化，请刷新后重试');
      }
      if (cardNumber && card.cardNumber !== cardNumber) {
        throw createHttpError(409, '卡密与订单预占不一致');
      }
      cardNumber = card.cardNumber;
    } else if (cardNumber) {
      const [cardRows] = await connection.query(
        `
          SELECT id, card_number AS cardNumber, status, reserved_order_id AS reservedOrderId
          FROM product_cards
          WHERE product_id = ?
            AND card_number = ?
          LIMIT 1
          FOR UPDATE
        `,
        [orderRow.productId, cardNumber],
      );
      const card = cardRows && cardRows.length ? cardRows[0] : null;
      if (!card) {
        throw createHttpError(404, '未找到该卡密');
      }
      if (card.status === 'sold') {
        throw createHttpError(409, '卡密已售出');
      }
      if (card.status === 'reserved' && Number(card.reservedOrderId) !== Number(orderId)) {
        throw createHttpError(409, '卡密已被占用');
      }
      cardId = card.id;
      cardNumber = card.cardNumber;
      await connection.query('UPDATE orders SET card_id = ? WHERE id = ?', [cardId, orderId]);
    } else {
      const [cardRows] = await connection.query(
        `
          SELECT id, card_number AS cardNumber
          FROM product_cards
          WHERE product_id = ?
            AND status = 'available'
          ORDER BY id ASC
          LIMIT 1
          FOR UPDATE
        `,
        [orderRow.productId],
      );
      const card = cardRows && cardRows.length ? cardRows[0] : null;
      if (!card) {
        throw createHttpError(409, '库存不足');
      }
      cardId = card.id;
      cardNumber = card.cardNumber;
      await connection.query('UPDATE orders SET card_id = ? WHERE id = ?', [cardId, orderId]);
    }

    const [orderUpdate] = await connection.query(
      `
        UPDATE orders
        SET
          card_number = ?,
          pay_status = 'paid',
          status = 'completed',
          paid_at = IFNULL(paid_at, NOW()),
          delivered_at = NOW()
        WHERE id = ?
      `,
      [cardNumber, orderId],
    );
    if (!orderUpdate.affectedRows) {
      throw createHttpError(409, '订单状态已变化，请刷新后重试');
    }

    const [cardUpdate] = await connection.query(
      `
        UPDATE product_cards
        SET
          status = 'sold',
          sold_order_id = ?,
          sold_at = NOW(),
          reserved_order_id = NULL,
          reserved_at = NULL
        WHERE id = ?
          AND status IN ('reserved', 'available')
          AND (reserved_order_id IS NULL OR reserved_order_id = ?)
      `,
      [orderId, cardId, orderId],
    );
    if (!cardUpdate.affectedRows) {
      throw createHttpError(409, '库存异常，请联系管理员');
    }

    await connection.commit();
    return { status: 'delivered', message: '发放成功', cardNumber };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // ignore
    }
    throw err;
  } finally {
    connection.release();
  }
}

router.get('/', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const { sortBy, sortOrder } = req.query;
  const { whereSql, params, error } = buildOrderWhere(req.query);
  if (error) return apiError(res, 400, error);

  const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM orders ${whereSql}`, params);
  const { column, order } = getOrderSort(sortBy, sortOrder);

  const list = await query(
    `
      SELECT
        id AS orderId,
        order_no AS orderNo,
        product_id AS productId,
        product_name AS productName,
        order_amount AS orderAmount,
        original_amount AS originalAmount,
        discount_amount AS discountAmount,
        original_amount AS originalAmount,
        discount_amount AS discountAmount,
        buyer_phone AS buyerPhone,
        payment_method AS paymentMethod,
        status,
        pay_status AS payStatus,
        refund_status AS refundStatus,
        payment_trade_no AS paymentTradeNo,
        DATE_FORMAT(paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders
      ${whereSql}
      ORDER BY ${column} ${order}
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/export', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { sortBy, sortOrder } = req.query;
  const { whereSql, params, error } = buildOrderWhere(req.query);
  if (error) return apiError(res, 400, error);

  const { column, order } = getOrderSort(sortBy, sortOrder);
  const rows = await query(
    `
      SELECT
        id AS orderId,
        order_no AS orderNo,
        product_name AS productName,
        order_amount AS orderAmount,
        original_amount AS originalAmount,
        discount_amount AS discountAmount,
        buyer_phone AS buyerPhone,
        payment_method AS paymentMethod,
        status,
        pay_status AS payStatus,
        card_number AS cardNumber,
        refund_status AS refundStatus,
        refund_amount AS refundAmount,
        DATE_FORMAT(refunded_at, '%Y-%m-%d %H:%i:%s') AS refundedAt,
        DATE_FORMAT(paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
        DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') AS deliveredAt,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders
      ${whereSql}
      ORDER BY ${column} ${order}
    `,
    params,
  );

  const headers = [
    '订单ID',
    '订单号',
    '商品名称',
    '实付金额',
    '原价',
    '优惠',
    '手机号',
    '支付方式',
    '订单状态',
    '支付状态',
    '卡密',
    '退款状态',
    '退款金额',
    '退款时间',
    '支付时间',
    '发货时间',
    '下单时间',
  ];

  function escapeCsv(value) {
    const raw = value === null || value === undefined ? '' : String(value);
    if (/[\",\r\n]/.test(raw)) return `"${raw.replace(/\"/g, '""')}"`;
    return raw;
  }

  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.orderId,
        row.orderNo,
        row.productName,
        row.orderAmount,
        row.originalAmount,
        row.discountAmount,
        row.buyerPhone,
        row.paymentMethod,
        row.status,
        row.payStatus,
        row.cardNumber,
        row.refundStatus,
        row.refundAmount,
        row.refundedAt,
        row.paidAt,
        row.deliveredAt,
        row.createdAt,
      ]
        .map(escapeCsv)
        .join(','),
    );
  }

  const filename = `orders-export-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\ufeff${lines.join('\n')}`);
}));

router.post('/batch-deliver', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const body = req.body || {};
  let items = Array.isArray(body.items) ? body.items : [];
  if (!items.length && Array.isArray(body.orderIds)) {
    items = body.orderIds.map((orderId) => ({ orderId }));
  }

  if (!items.length) return apiError(res, 400, 'items/orderIds 必填');

  const maxBatch = 200;
  if (items.length > maxBatch) return apiError(res, 400, `单次最多处理 ${maxBatch} 单`);

  const results = [];
  let success = 0;
  let failed = 0;

  for (const item of items) {
    const orderId = Number.parseInt(item.orderId, 10);
    if (Number.isNaN(orderId)) {
      failed += 1;
      results.push({ orderId: item.orderId, ok: false, message: '非法订单ID', status: 400 });
      continue;
    }
    const inputCardNumber = item.cardNumber ? String(item.cardNumber).trim() : '';

    try {
      const result = await deliverOrderInternal(orderId, inputCardNumber);
      success += 1;
      results.push({
        orderId,
        ok: true,
        message: result.message,
        cardNumber: result.cardNumber || null,
      });
    } catch (err) {
      failed += 1;
      results.push({
        orderId,
        ok: false,
        message: err?.message || '发放失败',
        status: err?.status || 500,
      });
    }
  }

  return apiSuccess(res, { total: items.length, success, failed, results }, '批量发放完成');
}));

router.get('/reconcile', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 20, maxPageSize: 100 });

  const totalRow = await queryOne(
    `
      SELECT COUNT(*) AS total
      FROM orders o
      LEFT JOIN product_cards pc ON pc.id = o.card_id
      WHERE o.pay_status = 'paid'
        AND (
          o.card_number IS NULL OR o.card_number = ''
          OR o.card_id IS NULL
          OR pc.id IS NULL
          OR pc.status <> 'sold'
          OR pc.sold_order_id <> o.id
        )
    `,
  );

  const list = await query(
    `
      SELECT
        o.id AS orderId,
        o.order_no AS orderNo,
        o.product_name AS productName,
        o.pay_status AS payStatus,
        o.status,
        o.card_id AS cardId,
        o.card_number AS cardNumber,
        pc.status AS cardStatus,
        pc.sold_order_id AS soldOrderId,
        DATE_FORMAT(o.paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders o
      LEFT JOIN product_cards pc ON pc.id = o.card_id
      WHERE o.pay_status = 'paid'
        AND (
          o.card_number IS NULL OR o.card_number = ''
          OR o.card_id IS NULL
          OR pc.id IS NULL
          OR pc.status <> 'sold'
          OR pc.sold_order_id <> o.id
        )
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/reconcile/summary', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const forceRefresh = String(req.query.refresh || '') === '1';
  let snapshot = getReconcileSnapshot();
  if (forceRefresh || !snapshot.updatedAt) {
    snapshot = await refreshReconcileSnapshot();
  }
  return apiSuccess(res, snapshot);
}));

router.get('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const row = await queryOne(
    `
      SELECT
        id AS orderId,
        order_no AS orderNo,
        user_id AS userId,
        product_id AS productId,
        product_name AS productName,
        order_amount AS orderAmount,
        original_amount AS originalAmount,
        discount_amount AS discountAmount,
        buyer_phone AS buyerPhone,
        payment_method AS paymentMethod,
        status,
        pay_status AS payStatus,
        refund_status AS refundStatus,
        payment_trade_no AS paymentTradeNo,
        refund_amount AS refundAmount,
        refund_reason AS refundReason,
        card_number AS cardNumber,
        DATE_FORMAT(paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
        DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') AS deliveredAt,
        DATE_FORMAT(refunded_at, '%Y-%m-%d %H:%i:%s') AS refundedAt,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [orderId],
  );
  if (!row) return apiError(res, 404, '订单不存在');
  return apiSuccess(res, row);
}));

router.patch('/:id/status', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const { status } = req.body || {};
  if (!status) return apiError(res, 400, 'status 必填');

  const row = await queryOne(
    'SELECT id, card_id AS cardId, pay_status AS payStatus FROM orders WHERE id = ? LIMIT 1',
    [orderId],
  );
  if (!row) return apiError(res, 404, '订单不存在');

  const result = await query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  if (!result.affectedRows) return apiError(res, 404, '订单不存在');

  if (status === 'cancelled' && row.payStatus !== 'paid') {
    await releaseReservedCard(row.cardId, orderId);
  }
  return apiSuccess(res, null, '更新成功');
}));

router.post('/:id/deliver', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const rawCardNumber = req.body?.cardNumber;
  const inputCardNumber = rawCardNumber ? String(rawCardNumber).trim() : '';

  try {
    const result = await deliverOrderInternal(orderId, inputCardNumber);
    return apiSuccess(res, null, result.message);
  } catch (err) {
    if (err && err.status) return apiError(res, err.status, err.message);
    throw err;
  }
}));

router.post('/:id/repair', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  try {
    const result = await repairPaidOrderInternal(orderId);
    return apiSuccess(res, { cardNumber: result.cardNumber }, result.message);
  } catch (err) {
    if (err && err.status) return apiError(res, err.status, err.message);
    throw err;
  }
}));

router.post('/:id/refund', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const { amount, reason } = req.body || {};

  const row = await queryOne(
    `
      SELECT id, pay_status AS payStatus, refund_status AS refundStatus, order_amount AS orderAmount
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [orderId],
  );
  if (!row) return apiError(res, 404, '订单不存在');
  if (row.payStatus !== 'paid') return apiError(res, 409, '订单未支付，无法退款');
  if (row.refundStatus === 'refunded') return apiError(res, 409, '订单已退款');

  const refundAmount = amount === undefined || amount === null || amount === '' ? row.orderAmount : Number(amount);
  if (Number.isNaN(refundAmount) || refundAmount <= 0) return apiError(res, 400, '退款金额不合法');
  if (Number(refundAmount) > Number(row.orderAmount)) return apiError(res, 400, '退款金额不能大于订单金额');

  await query(
    `
      UPDATE orders
      SET
        refund_status = 'refunded',
        refund_amount = ?,
        refund_reason = ?,
        refunded_at = NOW()
      WHERE id = ?
    `,
    [refundAmount, reason || null, orderId],
  );

  return apiSuccess(res, null, '退款成功');
}));

router.delete('/:id', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const row = await queryOne(
    'SELECT id, card_id AS cardId, pay_status AS payStatus FROM orders WHERE id = ? LIMIT 1',
    [orderId],
  );
  if (!row) return apiError(res, 404, '订单不存在');

  const result = await query('DELETE FROM orders WHERE id = ?', [orderId]);
  if (!result.affectedRows) return apiError(res, 404, '订单不存在');
  if (row.payStatus !== 'paid') {
    await releaseReservedCard(row.cardId, orderId);
  }
  return apiSuccess(res, null, '删除成功');
}));

module.exports = router;
