# B端财务统计 API

## 1. 销售统计

`GET /api/b/finance/sales-statistics?startDate=2025-12-01&endDate=2025-12-31`

### 响应体示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalOrders": 100,
    "paidOrders": 80,
    "refundedOrders": 2,
    "totalSalesAmount": "9999.00",
    "totalRefundAmount": "199.00",
    "conversionRate": "80.00%",
    "refundRate": "2.50%"
  }
}
```

## 2. 满减规则

`GET /api/b/finance/full-reduction`

### 响应体示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "enabled": true,
    "threshold": 100,
    "reduce": 10
  }
}
```

## 3. 更新满减规则

`PUT /api/b/finance/full-reduction`

### 请求体示例

```json
{
  "enabled": true,
  "threshold": 200,
  "reduce": 20
}
```
