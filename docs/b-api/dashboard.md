# B端仪表板 API

## 1. 数据概览

`GET /api/b/dashboard/overview`

### 响应体示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "productTotal": 10,
    "orderTotal": 100,
    "paidOrderTotal": 80,
    "todayOrderTotal": 5,
    "todaySalesAmount": "199.00",
    "totalSalesAmount": "9999.00",
    "conversionRate": "80.00%",
    "refundRate": "2.50%",
    "reconcileCount": 2,
    "reconcileCheckedAt": "2025-12-24 10:00:00"
  }
}
```
