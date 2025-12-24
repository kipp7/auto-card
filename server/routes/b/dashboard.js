const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { queryOne } = require('../../utils/db');
const { getReconcileSnapshot, refreshReconcileSnapshot } = require('../../jobs/reconcile-monitor');
const { apiSuccess } = require('../../utils/response');

const router = express.Router();

router.get('/overview', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const productTotalRow = await queryOne('SELECT COUNT(*) AS total FROM products', []);
  const orderTotalRow = await queryOne('SELECT COUNT(*) AS total FROM orders', []);
  const paidOrderTotalRow = await queryOne("SELECT COUNT(*) AS total FROM orders WHERE pay_status = 'paid'", []);
  const refundedOrderRow = await queryOne("SELECT COUNT(*) AS total FROM orders WHERE refund_status = 'refunded'", []);
  const todayOrderTotalRow = await queryOne("SELECT COUNT(*) AS total FROM orders WHERE DATE(created_at) = CURDATE()", []);
  const todaySalesRow = await queryOne(
    "SELECT IFNULL(SUM(order_amount), 0) AS amount FROM orders WHERE pay_status = 'paid' AND DATE(paid_at) = CURDATE()",
    [],
  );
  const totalSalesRow = await queryOne(
    "SELECT IFNULL(SUM(order_amount), 0) AS amount FROM orders WHERE pay_status = 'paid'",
    [],
  );

  let snapshot = getReconcileSnapshot();
  if (!snapshot.updatedAt) snapshot = await refreshReconcileSnapshot();

  const productTotal = Number(productTotalRow.total) || 0;
  const orderTotal = Number(orderTotalRow.total) || 0;
  const paidOrderTotal = Number(paidOrderTotalRow.total) || 0;
  const refundedTotal = Number(refundedOrderRow.total) || 0;

  return apiSuccess(res, {
    productTotal,
    orderTotal,
    paidOrderTotal,
    todayOrderTotal: Number(todayOrderTotalRow.total) || 0,
    todaySalesAmount: String(todaySalesRow.amount),
    totalSalesAmount: String(totalSalesRow.amount),
    conversionRate: orderTotal ? ((paidOrderTotal / orderTotal) * 100).toFixed(2) : '0.00',
    refundRate: paidOrderTotal ? ((refundedTotal / paidOrderTotal) * 100).toFixed(2) : '0.00',
    reconcileCount: Number(snapshot.count) || 0,
    reconcileCheckedAt: snapshot.updatedAt,
  });
}));

module.exports = router;
