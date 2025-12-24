# C端订单 API

## 1. 创建订单（允许匿名）

`POST /api/c/orders`

> Header：可选 `Authorization: Bearer <token>`，未登录时会以游客身份下单。

> 说明：下单后商品会被**临时锁定**（默认 15 分钟，可用 `ORDER_EXPIRE_MINUTES` 配置），避免同一商品被多人同时下单。

### 请求体

```json
{
  "productId": 4,
  "buyerPhone": "13113111311",
  "paymentMethod": "wechat"
}
```

### 响应体

```json
{
  "code": 0,
  "message": "订单创建成功",
  "data": {
    "orderId": 6,
    "orderNo": "ORD1763464220552ukksc6snw",
    "productName": "3333",
    "orderAmount": "43.00",
    "originalAmount": "49.00",
    "discountAmount": "6.00",
    "status": "pending",
    "expiresInSeconds": 900
  }
}
```

### 常见错误

- `409`：商品已售罄或正在被下单（被锁定）

## 2. 订单列表（登录用户）

`GET /api/c/orders?page=1&pageSize=20`

Header：`Authorization: Bearer <token>`

> 列表与详情均返回 `originalAmount`、`discountAmount` 字段（可能为 null）。

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

## 3. 游客订单查询（手机号）

`GET /api/c/orders/query?buyerPhone=13113111311&page=1&pageSize=20`

### 响应体

同「订单列表」结构。

## 4. 订单详情

`GET /api/c/orders/:id`

> 未支付订单不返回 `cardNumber`；支付完成后返回卡密。

### 响应体（示例）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": 6,
    "orderNo": "ORD1763464220552ukksc6snw",
    "productId": 4,
    "productName": "3333",
    "orderAmount": "43.00",
    "originalAmount": "49.00",
    "discountAmount": "6.00",
    "buyerPhone": "13113111311",
    "paymentMethod": "wechat",
    "status": "completed",
    "payStatus": "paid",
    "paymentTradeNo": "SIM-ORD1763464220552ukksc6snw",
    "refundStatus": "none",
    "refundAmount": null,
    "refundReason": null,
    "refundedAt": null,
    "paidAt": "2025-12-22 12:00:00",
    "deliveredAt": "2025-12-22 12:00:00",
    "cardNumber": "1----2----33",
    "createdAt": "2025-12-22 12:00:00",
    "expiresInSeconds": 0
  }
}
```

## 5. 模拟支付（演示用）

`POST /api/c/orders/:id/pay`

### 请求体

```json
{
  "success": true,
  "buyerPhone": "13113111311",
  "tradeNo": "SIM-123456"
}
```

> 游客支付/查询时需要提供 `buyerPhone`（可放在 Body 或 Query），用于权限校验。

### 响应体

返回「订单详情」结构。

### 常见错误

- `410`：订单已超时，请重新下单（超时会自动取消并释放商品）
- `409`：订单已取消/状态已变化（请刷新订单）

## 6. 取消订单

`POST /api/c/orders/:id/cancel`

> 游客取消时需要提供 `buyerPhone`（可放在 Body 或 Query）。

### 请求体

```json
{
  "buyerPhone": "13113111311"
}
```

### 响应体

返回「订单详情」结构，且会释放商品重新上架（若未售出）。

## 7. 支付回调（模拟）

`POST /api/c/orders/:id/notify`

请求体与「模拟支付」一致，主要用于演示“支付回调”流程。
