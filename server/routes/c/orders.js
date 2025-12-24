const express = require('express');

const { optionalAuth, requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { query, queryOne, getPool } = require('../../utils/db');
const { generateOrderNo } = require('../../utils/order');
const { parsePagination } = require('../../utils/pagination');
const { apiError, apiSuccess } = require('../../utils/response');
const { getFullReductionRule, calcFullReductionDiscount } = require('../../utils/marketing');

const router = express.Router();

function getExpireMinutes() {
  const raw = process.env.ORDER_EXPIRE_MINUTES;
  const n = Number.parseInt(raw || '15', 10);
  if (Number.isNaN(n) || n <= 0) return 15;
  return Math.min(n, 24 * 60);
}

function getExpireSeconds() {
  return getExpireMinutes() * 60;
}

function isValidBuyerPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ''));
}

function isValidPaymentMethod(method) {
  return ['wechat', 'alipay', 'qq'].includes(method);
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

async function releaseReservedCardTx(connection, cardId, orderId) {
  if (!cardId) return;
  await connection.query(
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

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getOrderDetail(orderId) {
  const row = await queryOne(
    `
      SELECT
        id AS orderId,
        order_no AS orderNo,
        user_id AS userId,
        product_id AS productId,
        card_id AS cardId,
        product_name AS productName,
        order_amount AS orderAmount,
        original_amount AS originalAmount,
        discount_amount AS discountAmount,
        buyer_phone AS buyerPhone,
        payment_method AS paymentMethod,
        status,
        pay_status AS payStatus,
        payment_trade_no AS paymentTradeNo,
        refund_status AS refundStatus,
        refund_amount AS refundAmount,
        refund_reason AS refundReason,
        card_number AS cardNumber,
        TIMESTAMPDIFF(SECOND, created_at, NOW()) AS ageSeconds,
        DATE_FORMAT(paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
        DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') AS deliveredAt,
        DATE_FORMAT(refunded_at, '%Y-%m-%d %H:%i:%s') AS refundedAt,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [orderId],
  );

  if (!row) return null;

  const { ageSeconds: rawAgeSeconds, ...rest } = row;

  if (row.payStatus !== 'paid') {
    const ageSeconds = Number(rawAgeSeconds) || 0;
    const expiresInSeconds = rest.status === 'cancelled' ? 0 : Math.max(0, getExpireSeconds() - ageSeconds);
    return {
      ...rest,
      cardNumber: null,
      paidAt: null,
      deliveredAt: null,
      expiresInSeconds,
    };
  }

  return { ...rest, expiresInSeconds: 0 };
}

router.post('/', optionalAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  const { productId, buyerPhone, paymentMethod } = req.body || {};
  if (!productId || !buyerPhone || !paymentMethod) return apiError(res, 400, 'productId/buyerPhone/paymentMethod 必填');
  const pid = Number.parseInt(String(productId), 10);
  if (Number.isNaN(pid)) return apiError(res, 400, '非法商品ID');
  if (!isValidBuyerPhone(buyerPhone)) return apiError(res, 400, '手机号格式错误');
  if (!isValidPaymentMethod(paymentMethod)) return apiError(res, 400, '非法支付方式');

  const orderNo = generateOrderNo();
  const connection = await getPool().getConnection();
  let orderId;
  let product;
  let reservedCard;
  try {
    await connection.beginTransaction();

    const [productRows] = await connection.query(
      `
        SELECT
          id,
          name,
          price,
          CASE
            WHEN promo_price IS NOT NULL
              AND (promo_start_at IS NULL OR promo_start_at <= NOW())
              AND (promo_end_at IS NULL OR promo_end_at >= NOW())
            THEN promo_price ELSE price
          END AS salePrice,
          status
        FROM products
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [pid],
    );
    product = productRows && productRows.length ? productRows[0] : null;
    if (!product || product.status !== 'online') {
      await connection.rollback();
      return apiError(res, 404, '商品不存在');
    }

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
      [pid],
    );
    reservedCard = cardRows && cardRows.length ? cardRows[0] : null;
    if (!reservedCard) {
      await connection.rollback();
      return apiError(res, 409, '库存不足');
    }

    const baseAmount = Number(product.salePrice ?? product.price);
    const rule = await getFullReductionRule();
    const discountAmount = calcFullReductionDiscount(baseAmount, rule);
    const orderAmount = Math.max(0, baseAmount - discountAmount);

    const [insertRes] = await connection.query(
      `
        INSERT INTO orders (
          order_no,
          user_id,
          product_id,
          card_id,
          product_name,
          order_amount,
          original_amount,
          discount_amount,
          buyer_phone,
          payment_method,
          status,
          pay_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
      `,
      [
        orderNo,
        req.user ? req.user.id : null,
        product.id,
        reservedCard.id,
        product.name,
        orderAmount,
        baseAmount,
        discountAmount,
        buyerPhone,
        paymentMethod,
      ],
    );
    orderId = insertRes.insertId;

    const [updateRes] = await connection.query(
      `
        UPDATE product_cards
        SET status = 'reserved',
            reserved_order_id = ?,
            reserved_at = NOW()
        WHERE id = ?
          AND status = 'available'
      `,
      [orderId, reservedCard.id],
    );
    if (!updateRes.affectedRows) {
      await connection.rollback();
      return apiError(res, 409, '库存不足');
    }

    await connection.commit();
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

  return apiSuccess(
    res,
    {
      orderId,
      orderNo,
      productName: product.name,
      orderAmount,
      originalAmount: baseAmount,
      discountAmount,
      status: 'pending',
      expiresInSeconds: getExpireSeconds(),
    },
    '订单创建成功',
  );
}));

router.get('/', requireAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 20, maxPageSize: 50 });

  const totalRow = await queryOne('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [req.user.id]);
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
        status,
        pay_status AS payStatus,
        refund_status AS refundStatus,
        CASE
          WHEN pay_status = 'paid' OR status = 'cancelled' THEN 0
          ELSE GREATEST(0, ? - TIMESTAMPDIFF(SECOND, created_at, NOW()))
        END AS expiresInSeconds,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [getExpireSeconds(), req.user.id, pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/query', asyncHandler(async (req, res) => {
  const { buyerPhone } = req.query;
  if (!buyerPhone) return apiError(res, 400, 'buyerPhone 必填');
  if (!isValidBuyerPhone(buyerPhone)) return apiError(res, 400, '手机号格式错误');

  const { page, pageSize, offset } = parsePagination(req.query, { page: 1, pageSize: 20, maxPageSize: 50 });

  const totalRow = await queryOne('SELECT COUNT(*) AS total FROM orders WHERE buyer_phone = ?', [buyerPhone]);
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
        status,
        pay_status AS payStatus,
        refund_status AS refundStatus,
        CASE
          WHEN pay_status = 'paid' OR status = 'cancelled' THEN 0
          ELSE GREATEST(0, ? - TIMESTAMPDIFF(SECOND, created_at, NOW()))
        END AS expiresInSeconds,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM orders
      WHERE buyer_phone = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [getExpireSeconds(), buyerPhone, pageSize, offset],
  );

  return apiSuccess(res, { list, total: totalRow.total, page, pageSize });
}));

router.get('/:id', optionalAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const orderRow = await queryOne('SELECT id, user_id AS userId, buyer_phone AS buyerPhone FROM orders WHERE id = ? LIMIT 1', [orderId]);
  if (!orderRow) return apiError(res, 404, '订单不存在');

  if (req.user) {
    if (orderRow.userId !== req.user.id) return apiError(res, 403, '无权限访问');
  } else {
    const buyerPhone = req.query.buyerPhone;
    if (buyerPhone && !isValidBuyerPhone(buyerPhone)) return apiError(res, 400, '手机号格式错误');
    if (!buyerPhone || buyerPhone !== orderRow.buyerPhone) return apiError(res, 403, '无权限访问');
  }

  const detail = await getOrderDetail(orderId);
  return apiSuccess(res, detail);
}));

router.post('/:id/cancel', optionalAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const orderRow = await queryOne(
    `
      SELECT
        id,
        user_id AS userId,
        buyer_phone AS buyerPhone,
        product_id AS productId,
        card_id AS cardId,
        status,
        pay_status AS payStatus
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [orderId],
  );
  if (!orderRow) return apiError(res, 404, '订单不存在');

  if (req.user) {
    if (orderRow.userId !== req.user.id) return apiError(res, 403, '无权限访问');
  } else {
    const buyerPhone = req.body?.buyerPhone || req.query.buyerPhone;
    if (buyerPhone && !isValidBuyerPhone(buyerPhone)) return apiError(res, 400, '手机号格式错误');
    if (!buyerPhone || buyerPhone !== orderRow.buyerPhone) return apiError(res, 403, '无权限访问');
  }

  if (orderRow.payStatus === 'paid') {
    return apiError(res, 409, '订单已支付，无法取消');
  }

  if (orderRow.status !== 'cancelled') {
    await query("UPDATE orders SET status = 'cancelled' WHERE id = ? AND pay_status = 'unpaid' AND status = 'pending'", [orderId]);
  }

  await releaseReservedCard(orderRow.cardId, orderId);
  return apiSuccess(res, await getOrderDetail(orderId), '已取消');
}));

async function processOrderPayment({ orderId, buyerPhone, userId, success = true, tradeNo }) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
        SELECT
          id,
          order_no AS orderNo,
          user_id AS userId,
          buyer_phone AS buyerPhone,
          product_id AS productId,
          card_id AS cardId,
          status,
          pay_status AS payStatus,
          payment_trade_no AS paymentTradeNo,
          TIMESTAMPDIFF(SECOND, created_at, NOW()) AS ageSeconds
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

    if (userId) {
      if (orderRow.userId !== userId) {
        throw createHttpError(403, '无权限访问');
      }
    } else {
      if (buyerPhone && !isValidBuyerPhone(buyerPhone)) {
        throw createHttpError(400, '手机号格式错误');
      }
      if (!buyerPhone || buyerPhone !== orderRow.buyerPhone) {
        throw createHttpError(403, '无权限访问');
      }
    }

    if (!success) {
      await connection.query(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND pay_status = 'unpaid' AND status = 'pending'",
        [orderId],
      );
      if (orderRow.cardId) {
        await releaseReservedCardTx(connection, orderRow.cardId, orderId);
      }
      await connection.commit();
      return { message: '已取消', detail: await getOrderDetail(orderId) };
    }

    if (orderRow.payStatus === 'paid') {
      await connection.commit();
      return { message: '订单已完成', detail: await getOrderDetail(orderId) };
    }
    if (orderRow.status === 'cancelled') {
      await connection.commit();
      throw createHttpError(409, '订单已取消');
    }

    const ageSeconds = Number(orderRow.ageSeconds) || 0;
    if (ageSeconds > getExpireSeconds()) {
      await connection.query(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND pay_status = 'unpaid' AND status = 'pending'",
        [orderId],
      );
      if (orderRow.cardId) {
        await releaseReservedCardTx(connection, orderRow.cardId, orderId);
      }
      await connection.commit();
      throw createHttpError(410, '订单已超时，请重新下单');
    }

    let cardId = orderRow.cardId;
    let cardNumber = null;
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
      if (!card) {
        throw createHttpError(409, '库存异常，请联系管理员');
      }
      if (card.status === 'sold') {
        throw createHttpError(409, '库存异常，请联系管理员');
      }
      if (card.status === 'reserved' && Number(card.reservedOrderId) !== Number(orderId)) {
        throw createHttpError(409, '订单状态已变化，请刷新后重试');
      }
      cardNumber = card.cardNumber;
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

    const finalTradeNo = tradeNo || orderRow.paymentTradeNo || `SIM-${orderRow.orderNo}`;
    const [payRes] = await connection.query(
      `
        UPDATE orders
        SET pay_status = 'paid',
            status = 'completed',
            paid_at = NOW(),
            delivered_at = NOW(),
            card_number = ?,
            payment_trade_no = IFNULL(payment_trade_no, ?)
        WHERE id = ?
          AND pay_status = 'unpaid'
          AND status = 'pending'
      `,
      [cardNumber, finalTradeNo, orderId],
    );
    if (!payRes.affectedRows) {
      await connection.commit();
      const current = await getOrderDetail(orderId);
      if (current && current.payStatus === 'paid') return { message: '订单已完成', detail: current };
      throw createHttpError(409, '订单状态已变化，请刷新后重试');
    }

    const [cardRes] = await connection.query(
      `
        UPDATE product_cards
        SET status = 'sold',
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
    if (!cardRes.affectedRows) {
      throw createHttpError(409, '库存异常，请联系管理员');
    }

    await connection.commit();
    return { message: '支付成功', detail: await getOrderDetail(orderId) };
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

router.post('/:id/pay', optionalAuth({ types: ['mobile'] }), asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const { success = true, tradeNo } = req.body || {};
  const buyerPhone = req.body?.buyerPhone || req.query.buyerPhone;
  try {
    const result = await processOrderPayment({
      orderId,
      buyerPhone,
      userId: req.user ? req.user.id : null,
      success,
      tradeNo,
    });
    return apiSuccess(res, result.detail, result.message);
  } catch (err) {
    if (err && err.status) return apiError(res, err.status, err.message);
    throw err;
  }
}));

router.post('/:id/notify', asyncHandler(async (req, res) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return apiError(res, 400, '非法订单ID');

  const { success = true, tradeNo } = req.body || {};
  const buyerPhone = req.body?.buyerPhone || req.query.buyerPhone;

  try {
    const result = await processOrderPayment({
      orderId,
      buyerPhone,
      userId: null,
      success,
      tradeNo,
    });
    return apiSuccess(res, result.detail, result.message);
  } catch (err) {
    if (err && err.status) return apiError(res, err.status, err.message);
    throw err;
  }
}));

module.exports = router;
