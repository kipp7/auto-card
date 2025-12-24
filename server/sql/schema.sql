-- MySQL 5.7+
-- 数据库可通过 `npm run db:init` 自动创建（或手动创建也可以）。

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` char(32) NOT NULL COMMENT '密码(MD5)',
  `type` varchar(20) NOT NULL DEFAULT 'mobile' COMMENT '用户类型：admin/mobile',
  `status` varchar(20) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled/disabled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(200) NOT NULL COMMENT '商品名称',
  `category` varchar(100) NOT NULL COMMENT '分类',
  `price` decimal(10,2) NOT NULL COMMENT '售价',
  `original_price` decimal(10,2) DEFAULT NULL COMMENT '原价',
  `promo_price` decimal(10,2) DEFAULT NULL COMMENT '限时价',
  `promo_start_at` datetime DEFAULT NULL COMMENT '限时价开始时间',
  `promo_end_at` datetime DEFAULT NULL COMMENT '限时价结束时间',
  `followers` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '粉丝数',
  `likes` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '赞藏数',
  `is_real_name` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否实名：0否/1是',
  `card_number` mediumtext DEFAULT NULL COMMENT '账号卡密',
  `description` text DEFAULT NULL COMMENT '商品简介',
  `detailed_intro` mediumtext DEFAULT NULL COMMENT '详细介绍(富文本)',
  `usage_instructions` mediumtext DEFAULT NULL COMMENT '使用说明(富文本)',
  `main_image` varchar(500) DEFAULT NULL COMMENT '主图URL',
  `screenshot` varchar(500) DEFAULT NULL COMMENT '账号截图URL',
  `gallery_images` json DEFAULT NULL COMMENT '其他图片URL列表(JSON)',
  `status` varchar(20) NOT NULL DEFAULT 'online' COMMENT '状态：online/offline',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_is_real_name` (`is_real_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_price` (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title` varchar(200) NOT NULL COMMENT '标题',
  `content` mediumtext NOT NULL COMMENT '内容(富文本)',
  `status` varchar(20) NOT NULL DEFAULT 'published' COMMENT '状态：published/draft',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序（数字越大越靠前）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';

CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `user_id` int(11) unsigned DEFAULT NULL COMMENT '用户ID(可空，游客下单)',
  `product_id` int(11) unsigned NOT NULL COMMENT '商品ID',
  `card_id` int(11) unsigned DEFAULT NULL COMMENT '预占卡密ID',
  `product_name` varchar(200) NOT NULL COMMENT '商品名称快照',
  `order_amount` decimal(10,2) NOT NULL COMMENT '订单金额',
  `original_amount` decimal(10,2) DEFAULT NULL COMMENT '原始金额',
  `discount_amount` decimal(10,2) DEFAULT NULL COMMENT '优惠金额',
  `buyer_phone` varchar(20) NOT NULL COMMENT '购买手机号',
  `payment_method` varchar(20) NOT NULL COMMENT '支付方式：wechat/alipay/qq',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '订单状态：pending/paid/completed/cancelled',
  `pay_status` varchar(20) NOT NULL DEFAULT 'unpaid' COMMENT '支付状态：unpaid/paid',
  `payment_trade_no` varchar(64) DEFAULT NULL COMMENT '支付流水号',
  `refund_status` varchar(20) NOT NULL DEFAULT 'none' COMMENT '退款状态：none/pending/refunded/failed',
  `refund_amount` decimal(10,2) DEFAULT NULL COMMENT '退款金额',
  `refund_reason` varchar(255) DEFAULT NULL COMMENT '退款原因',
  `refunded_at` datetime DEFAULT NULL COMMENT '退款时间',
  `paid_at` datetime DEFAULT NULL COMMENT '支付时间',
  `delivered_at` datetime DEFAULT NULL COMMENT '发货时间',
  `card_number` mediumtext DEFAULT NULL COMMENT '发放卡密(支付后可见)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_buyer_phone` (`buyer_phone`),
  KEY `idx_status` (`status`),
  KEY `idx_pay_status` (`pay_status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `setting_key` varchar(100) NOT NULL COMMENT '配置键',
  `setting_value` text NOT NULL COMMENT '配置值(JSON)',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统设置';

CREATE TABLE IF NOT EXISTS `product_cards` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `product_id` int(11) unsigned NOT NULL COMMENT '商品ID',
  `card_number` mediumtext NOT NULL COMMENT '卡密内容',
  `card_hash` char(32) NOT NULL COMMENT '卡密hash(MD5)',
  `status` varchar(20) NOT NULL DEFAULT 'available' COMMENT '状态：available/reserved/sold/disabled',
  `reserved_order_id` int(11) unsigned DEFAULT NULL COMMENT '预占订单ID',
  `sold_order_id` int(11) unsigned DEFAULT NULL COMMENT '售出订单ID',
  `reserved_at` datetime DEFAULT NULL COMMENT '预占时间',
  `sold_at` datetime DEFAULT NULL COMMENT '售出时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_card_hash` (`product_id`, `card_hash`),
  KEY `idx_product_status` (`product_id`, `status`),
  KEY `idx_reserved_order_id` (`reserved_order_id`),
  KEY `idx_sold_order_id` (`sold_order_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品卡密库存表';
