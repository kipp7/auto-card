const { query } = require('../utils/db');

function getExpireMinutes() {
  const raw = process.env.ORDER_EXPIRE_MINUTES;
  const n = Number.parseInt(raw || '15', 10);
  if (Number.isNaN(n) || n <= 0) return 15;
  return Math.min(n, 24 * 60);
}

async function cleanupExpiredOrders() {
  const cutoff = new Date(Date.now() - getExpireMinutes() * 60 * 1000);
  const rows = await query(
    `
      SELECT id
      FROM orders
      WHERE pay_status = 'unpaid'
        AND status = 'pending'
        AND created_at < ?
      ORDER BY created_at ASC
      LIMIT 200
    `,
    [cutoff],
  );

  if (!rows || !rows.length) return { cancelledOrders: 0, releasedCards: 0 };

  const orderIds = rows.map((r) => r.id).filter(Boolean);

  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    const orderUpdateRes = await query(
      `
        UPDATE orders
        SET status = 'cancelled'
        WHERE id IN (${placeholders})
          AND pay_status = 'unpaid'
          AND status = 'pending'
      `,
      orderIds,
    );

    const releaseRes = await query(
      `
        UPDATE product_cards
        SET status = 'available',
            reserved_order_id = NULL,
            reserved_at = NULL
        WHERE status = 'reserved'
          AND reserved_order_id IN (${placeholders})
      `,
      orderIds,
    );

    return {
      cancelledOrders: Number(orderUpdateRes.affectedRows) || 0,
      releasedCards: Number(releaseRes.affectedRows) || 0,
    };
  }

  return { cancelledOrders: 0, releasedCards: 0 };
}

function startOrderCleanup(options) {
  const intervalSeconds = Number.parseInt(options?.intervalSeconds || '60', 10);
  const intervalMs = (Number.isNaN(intervalSeconds) || intervalSeconds <= 0 ? 60 : intervalSeconds) * 1000;

  const run = async () => {
    const result = await cleanupExpiredOrders();
    if (result.cancelledOrders || result.releasedCards) {
      console.log('[order-cleanup]', result);
    }
  };

  run().catch((err) => console.error('[order-cleanup]', err));
  const timer = setInterval(() => run().catch((err) => console.error('[order-cleanup]', err)), intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = {
  cleanupExpiredOrders,
  startOrderCleanup,
};
