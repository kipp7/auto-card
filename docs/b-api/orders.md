# B端订单管理 API

## 1. 订单列表

`GET /api/b/orders`

> 列表与详情均返回 `originalAmount`、`discountAmount` 字段（可能为 null）。

### Query 参数

- `page`（默认 1）
- `pageSize`（默认 20）
- `orderNo`（精确或模糊）
- `buyerPhone`
- `productName`（商品名称模糊匹配）
- `status`（pending/completed/cancelled）
- `payStatus`（paid/unpaid）
- `refundStatus`（none/pending/refunded/failed）
- `paymentMethod`（wechat/alipay/qq）
- `startDate`（YYYY-MM-DD）
- `endDate`（YYYY-MM-DD）
- `sortBy`（createdAt/orderAmount）
- `sortOrder`（asc/desc）

## 2. 订单详情

`GET /api/b/orders/:id`

> 返回字段包含 `originalAmount`（原价金额）与 `discountAmount`（优惠金额）。

## 3. 修改状态

`PATCH /api/b/orders/:id/status`

```json
{
  "status": "cancelled"
}
```

> 说明：取消未支付订单会释放预占卡密。

## 4. 手动发放（补发卡密）

`POST /api/b/orders/:id/deliver`

```json
{
  "cardNumber": "1----2----33"
}
```

> 说明：`cardNumber` 可留空，系统自动分配库存卡密。

## 5. 批量发放

`POST /api/b/orders/batch-deliver`

### 请求体示例

```json
{
  "orderIds": [1, 2, 3]
}
```

或

```json
{
  "items": [
    { "orderId": 1 },
    { "orderId": 2, "cardNumber": "xxx" }
  ]
}
```

## 6. 导出订单 CSV

`GET /api/b/orders/export`

## 7. 对账检查（异常订单）

`GET /api/b/orders/reconcile`

## 8. 修复已支付异常订单
`POST /api/b/orders/:id/repair`

> 说明：用于对账检查中已支付但卡密异常的订单，系统会尝试重新绑定库存卡密并补齐发货状态；库存不足或卡密冲突时返回 409。

## 9. 订单退款

`POST /api/b/orders/:id/refund`

```json
{
  "amount": 99.9,
  "reason": "用户申请退款"
}
```

## 10. 删除订单

`DELETE /api/b/orders/:id`

> 说明：删除未支付订单会释放预占卡密。

## 11. 对账检查汇总

`GET /api/b/orders/reconcile/summary`

### 响应体示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "count": 3,
    "checkedAt": "2025-12-24 10:00:00"
  }
}
```
