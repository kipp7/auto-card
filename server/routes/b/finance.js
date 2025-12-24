const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { queryOne } = require('../../utils/db');
const { getFullReductionRule, saveFullReductionRule } = require('../../utils/marketing');
const { apiError, apiSuccess } = require('../../utils/response');

const router = express.Router();

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

router.get('/sales-statistics', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = [];
  const params = [];

  if (startDate) {
    if (!isDateString(startDate)) return apiError(res, 400, 'startDate 格式错误');
    where.push('created_at >= ?');
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    if (!isDateString(endDate)) return apiError(res, 400, 'endDate 格式错误');
    where.push('created_at <= ?');
    params.push(`${endDate} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const row = await queryOne(
    `
      SELECT
        COUNT(*) AS totalOrders,
        SUM(pay_status = 'paid') AS paidOrders,
        SUM(refund_status = 'refunded') AS refundedOrders,
        IFNULL(SUM(CASE WHEN pay_status = 'paid' THEN order_amount ELSE 0 END), 0) AS totalSalesAmount,
        IFNULL(SUM(CASE WHEN refund_status = 'refunded' THEN refund_amount ELSE 0 END), 0) AS totalRefundAmount
      FROM orders
      ${whereSql}
    `,
    params,
  );

  const totalOrders = Number(row.totalOrders) || 0;
  const paidOrders = Number(row.paidOrders) || 0;
  const refundedOrders = Number(row.refundedOrders) || 0;

  return apiSuccess(res, {
    totalOrders,
    paidOrders,
    refundedOrders,
    totalSalesAmount: String(row.totalSalesAmount),
    totalRefundAmount: String(row.totalRefundAmount),
    conversionRate: totalOrders ? ((paidOrders / totalOrders) * 100).toFixed(2) : '0.00',
    refundRate: paidOrders ? ((refundedOrders / paidOrders) * 100).toFixed(2) : '0.00',
  });
}));

router.get('/full-reduction', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const rule = await getFullReductionRule();
  return apiSuccess(res, rule);
}));

router.put('/full-reduction', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const rule = await saveFullReductionRule(req.body || {});
  return apiSuccess(res, rule, '更新成功');
}));

module.exports = router;
