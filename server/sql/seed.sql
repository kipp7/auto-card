-- 默认管理员账号：admin / admin123
INSERT INTO `users` (`username`, `password`, `type`, `status`)
VALUES ('admin', '0192023a7bbd73250516f069df18b500', 'admin', 'enabled')
ON DUPLICATE KEY UPDATE `type`='admin', `status`='enabled';

-- 默认测试用户：test123 / test123
INSERT INTO `users` (`username`, `password`, `type`, `status`)
VALUES ('test123', 'cc03e747a6afbbcbf8be7668acfebee5', 'mobile', 'enabled')
ON DUPLICATE KEY UPDATE `type`='mobile', `status`='enabled';

INSERT INTO `announcements` (`title`, `content`, `status`, `sort`)
VALUES ('平台公告', '<p>欢迎使用卡密交易平台，支付成功后自动发货。请按页面提示完成支付。</p>', 'published', 10);

INSERT INTO `settings` (`setting_key`, `setting_value`)
VALUES ('full_reduction_rule', '{"enabled":false,"threshold":100,"reduce":10}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

INSERT INTO `products` (
  `name`,
  `category`,
  `price`,
  `original_price`,
  `followers`,
  `likes`,
  `is_real_name`,
  `card_number`,
  `description`,
  `detailed_intro`,
  `usage_instructions`,
  `main_image`,
  `screenshot`,
  `gallery_images`,
  `status`
)
VALUES
(
  '热门账号卡密 - 美妆领域',
  'xiaohongshuo',
  99.90,
  199.00,
  12000,
  58000,
  1,
  'account-1----password-1',
  '适合美妆内容方向，粉丝活跃。',
  '<p>这里是商品详细介绍（示例）。</p>',
  '<p>这里是使用说明（示例）。</p>',
  'https://via.placeholder.com/600x600.png?text=Product-1',
  'https://via.placeholder.com/600x600.png?text=Screenshot-1',
  JSON_ARRAY('https://via.placeholder.com/900x600.png?text=Gallery-1A','https://via.placeholder.com/900x600.png?text=Gallery-1B'),
  'online'
),
(
  '热门账号卡密 - 健身领域',
  'mouyin',
  88.00,
  120.00,
  8000,
  21000,
  0,
  'account-2----password-2',
  '适合健身内容方向，数据稳定。',
  '<p>这里是商品详细介绍（示例）。</p>',
  '<p>这里是使用说明（示例）。</p>',
  'https://via.placeholder.com/600x600.png?text=Product-2',
  'https://via.placeholder.com/600x600.png?text=Screenshot-2',
  JSON_ARRAY('https://via.placeholder.com/900x600.png?text=Gallery-2A'),
  'online'
);
