# B端商品管理 API

## 1. 商品列表

`GET /api/b/products`

### Query 参数

- `page`（默认 1）
- `pageSize`（默认 20）
- `name`（模糊匹配）
- `category`
- `status`（online/offline）
- `isRealName`（true/false）
- `sortBy`（price/followers/likes/createdAt）
- `sortOrder`（asc/desc）

### 响应体

同 C 端列表结构，额外返回管理字段（如 `updatedAt`），并包含库存字段：

- `stockAvailable`
- `stockReserved`
- `stockSold`
- `stockTotal`

并包含促销字段：

- `promoPrice`
- `promoStartAt`
- `promoEndAt`
- `promoActive`

## 2. 商品详情

`GET /api/b/products/:id`

## 3. 创建商品

`POST /api/b/products`

请求体示例：

```json
{
  "name": "32222",
  "category": "xiaohongshuo",
  "price": 33,
  "originalPrice": 333,
  "promoPrice": 299,
  "promoStartAt": "2025-12-24 00:00:00",
  "promoEndAt": "2025-12-31 23:59:59",
  "followers": 3231,
  "likes": 321,
  "isRealName": true,
  "cardNumber": "1----2----33",
  "status": "online",
  "description": "321321",
  "mainImage": "http://xxx/products/xxx.jpg",
  "screenshot": "http://xxx/products/xxx.jpg",
  "detailedIntro": "<p>321321</p>",
  "usageInstructions": "<p>321321</p>",
  "galleryImages": ["http://xxx/1.jpg", "http://xxx/2.jpg"]
}
```

## 4. 编辑商品

`PUT /api/b/products/:id`

## 5. 上架/下架

`PATCH /api/b/products/:id/status`

```json
{
  "status": "offline"
}
```

## 6. 删除商品

`DELETE /api/b/products/:id`

> 说明：若该商品已有订单记录（无论是否支付），将返回 `409`，不允许删除。

## 7. 商品库存列表

`GET /api/b/products/:id/stock`

### Query 参数

- `page`（默认 1）
- `pageSize`（默认 20，最大 100）
- `status`（available/reserved/sold）
- `keyword`（卡密模糊匹配）

## 8. 导入库存

`POST /api/b/products/:id/stock/import`

### 请求体（任选其一）

```json
{
  "cards": ["卡密1", "卡密2"]
}
```

或

```json
{
  "cardsText": "卡密1\n卡密2"
}
```

### 响应体示例

```json
{
  "attempted": 2,
  "inserted": 2,
  "skipped": 0,
  "summary": {
    "invalid": 0,
    "duplicate": 0,
    "existed": 0,
    "overLimit": 0
  },
  "errors": [],
  "stock": {
    "stockAvailable": 10,
    "stockReserved": 1,
    "stockSold": 3,
    "stockTotal": 14
  }
}
```

## 9. 删除单条库存卡密

`DELETE /api/b/products/:id/stock/:cardId`

> 说明：仅允许删除 `available` 状态的卡密。
