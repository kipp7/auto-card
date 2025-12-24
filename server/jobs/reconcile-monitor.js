const { queryOne } = require('../utils/db');

let snapshot = {
  count: 0,
  updatedAt: null,
};

async function refreshReconcileSnapshot() {
  const row = await queryOne(
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

  snapshot = {
    count: Number(row?.total) || 0,
    updatedAt: new Date().toISOString(),
  };
  return snapshot;
}

function getReconcileSnapshot() {
  return snapshot;
}

function startReconcileMonitor(options = {}) {
  const intervalSeconds = Number(options.intervalSeconds || 300);
  refreshReconcileSnapshot().catch(() => {
    // ignore initial failure
  });

  const timer = setInterval(() => {
    refreshReconcileSnapshot().catch(() => {
      // ignore interval failure
    });
  }, Math.max(30, intervalSeconds) * 1000);

  if (timer.unref) timer.unref();
}

module.exports = {
  startReconcileMonitor,
  getReconcileSnapshot,
  refreshReconcileSnapshot,
};
