const fs = require('fs');
const path = require('path');

const mysql = require('mysql2/promise');

const { loadEnvFile } = require('../utils/env');
const { md5 } = require('../utils/hash');

function readSql(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

async function hasColumn(connection, { database, table, column }) {
  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [database, table, column],
  );
  return Number(row.total) > 0;
}

async function hasIndex(connection, { table, indexName }) {
  const [rows] = await connection.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, indexName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasTable(connection, { database, table }) {
  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
    `,
    [database, table],
  );
  return Number(row.total) > 0;
}

function splitCards(raw) {
  if (!raw) return [];
  const lines = String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Array.from(new Set(lines));
}

async function main() {
  loadEnvFile();

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;

  if (!database) throw new Error('DB_NAME is required');

  const bootstrapConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
  } finally {
    await bootstrapConnection.end();
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    const schemaSql = readSql('sql/schema.sql');
    await connection.query(schemaSql);

    // ---- lightweight migrations (keep MySQL 5.7 compatible) ----
    const hasCardId = await hasColumn(connection, { database, table: 'orders', column: 'card_id' });
    if (!hasCardId) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `card_id` int(11) unsigned DEFAULT NULL COMMENT '预占卡密ID' AFTER `product_id`;",
      );
    }
    const hasCardIdIndex = await hasIndex(connection, { table: 'orders', indexName: 'idx_card_id' });
    if (!hasCardIdIndex) {
      await connection.query('ALTER TABLE `orders` ADD INDEX `idx_card_id` (`card_id`);');
    }

    const hasPaymentTradeNo = await hasColumn(connection, { database, table: 'orders', column: 'payment_trade_no' });
    if (!hasPaymentTradeNo) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `payment_trade_no` varchar(64) DEFAULT NULL COMMENT '支付流水号' AFTER `pay_status`;",
      );
    }
    const hasRefundStatus = await hasColumn(connection, { database, table: 'orders', column: 'refund_status' });
    if (!hasRefundStatus) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `refund_status` varchar(20) NOT NULL DEFAULT 'none' COMMENT '退款状态：none/pending/refunded/failed' AFTER `payment_trade_no`;",
      );
    }
    const hasRefundAmount = await hasColumn(connection, { database, table: 'orders', column: 'refund_amount' });
    if (!hasRefundAmount) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `refund_amount` decimal(10,2) DEFAULT NULL COMMENT '退款金额' AFTER `refund_status`;",
      );
    }
    const hasRefundReason = await hasColumn(connection, { database, table: 'orders', column: 'refund_reason' });
    if (!hasRefundReason) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `refund_reason` varchar(255) DEFAULT NULL COMMENT '退款原因' AFTER `refund_amount`;",
      );
    }
    const hasRefundedAt = await hasColumn(connection, { database, table: 'orders', column: 'refunded_at' });
    if (!hasRefundedAt) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `refunded_at` datetime DEFAULT NULL COMMENT '退款时间' AFTER `refund_reason`;",
      );
    }
    const hasOriginalAmount = await hasColumn(connection, { database, table: 'orders', column: 'original_amount' });
    if (!hasOriginalAmount) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `original_amount` decimal(10,2) DEFAULT NULL COMMENT '原始金额' AFTER `order_amount`;",
      );
    }
    const hasDiscountAmount = await hasColumn(connection, { database, table: 'orders', column: 'discount_amount' });
    if (!hasDiscountAmount) {
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `discount_amount` decimal(10,2) DEFAULT NULL COMMENT '优惠金额' AFTER `original_amount`;",
      );
    }

    const hasPromoPrice = await hasColumn(connection, { database, table: 'products', column: 'promo_price' });
    if (!hasPromoPrice) {
      await connection.query(
        "ALTER TABLE `products` ADD COLUMN `promo_price` decimal(10,2) DEFAULT NULL COMMENT '限时价' AFTER `original_price`;",
      );
    }
    const hasPromoStart = await hasColumn(connection, { database, table: 'products', column: 'promo_start_at' });
    if (!hasPromoStart) {
      await connection.query(
        "ALTER TABLE `products` ADD COLUMN `promo_start_at` datetime DEFAULT NULL COMMENT '限时价开始时间' AFTER `promo_price`;",
      );
    }
    const hasPromoEnd = await hasColumn(connection, { database, table: 'products', column: 'promo_end_at' });
    if (!hasPromoEnd) {
      await connection.query(
        "ALTER TABLE `products` ADD COLUMN `promo_end_at` datetime DEFAULT NULL COMMENT '限时价结束时间' AFTER `promo_start_at`;",
      );
    }

    const hasSettingsTable = await hasTable(connection, { database, table: 'settings' });
    if (!hasSettingsTable) {
      await connection.query(
        `
          CREATE TABLE IF NOT EXISTS \`settings\` (
            \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
            \`setting_key\` varchar(100) NOT NULL COMMENT '配置键',
            \`setting_value\` text NOT NULL COMMENT '配置值(JSON)',
            \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统设置';
        `,
      );
    }

    const hasCardHash = await hasColumn(connection, { database, table: 'product_cards', column: 'card_hash' });
    if (!hasCardHash) {
      await connection.query(
        "ALTER TABLE `product_cards` ADD COLUMN `card_hash` char(32) DEFAULT NULL COMMENT '卡密hash(MD5)' AFTER `card_number`;",
      );
    }

    const [needHashRows] = await connection.query(
      'SELECT id, card_number AS cardNumber FROM product_cards WHERE card_hash IS NULL OR card_hash = \'\' LIMIT 5000',
    );
    for (const row of needHashRows) {
      await connection.query('UPDATE product_cards SET card_hash = ? WHERE id = ?', [md5(row.cardNumber), row.id]);
    }

    await connection.query(
      "ALTER TABLE `product_cards` MODIFY COLUMN `card_hash` char(32) NOT NULL COMMENT '卡密hash(MD5)';",
    );

    // De-duplicate before adding unique index (best-effort)
    await connection.query(
      `
        DELETE pc1 FROM product_cards pc1
        JOIN product_cards pc2
          ON pc1.product_id = pc2.product_id
         AND pc1.card_hash = pc2.card_hash
         AND pc1.id > pc2.id
      `,
    );

    const hasUnique = await hasIndex(connection, { table: 'product_cards', indexName: 'uk_product_card_hash' });
    if (!hasUnique) {
      await connection.query(
        'ALTER TABLE `product_cards` ADD UNIQUE INDEX `uk_product_card_hash` (`product_id`, `card_hash`);',
      );
    }

    const [[productCount]] = await connection.query('SELECT COUNT(*) AS total FROM products');
    const [[announcementCount]] = await connection.query('SELECT COUNT(*) AS total FROM announcements');

    if (Number(productCount.total) === 0 && Number(announcementCount.total) === 0) {
      const seedSql = readSql('sql/seed.sql');
      await connection.query(seedSql);
    }

    // Backfill: products.card_number -> product_cards (only when product has no stock rows yet)
    const [products] = await connection.query(
      'SELECT id, card_number AS cardNumber FROM products WHERE card_number IS NOT NULL AND card_number <> \'\'',
    );
    for (const p of products) {
      const cards = splitCards(p.cardNumber);
      if (!cards.length) continue;
      const [[countRow]] = await connection.query('SELECT COUNT(*) AS total FROM product_cards WHERE product_id = ?', [p.id]);
      if (Number(countRow.total) > 0) continue;
      for (const card of cards) {
        await connection.query(
          'INSERT IGNORE INTO product_cards (product_id, card_number, card_hash, status) VALUES (?, ?, ?, ?)',
          [p.id, card, md5(card), 'available'],
        );
      }
    }
  } finally {
    await connection.end();
  }
}

main()
  .then(() => {
    console.log('数据库初始化完成');
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
