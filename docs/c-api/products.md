# C端商品 API

## 1. 商品列表

`GET /api/c/products`

### Query 参数

- `page`：页码（默认 1）
- `pageSize`：每页数量（默认 20）
- `keyword`：关键字（匹配名称）
- `category`：分类
- `status`：状态（默认 `online`）
- `isRealName`：是否实名（`true/false`）
- `sortBy`：排序字段（`price`/`followers`/`likes`/`createdAt`）
- `sortOrder`：`asc/desc`

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "小红薯1号 - 美妆博主",
        "category": "xiaohongshuo",
        "price": "99.90",
        "originalPrice": "199.00",
        "promoPrice": "79.90",
        "promoStartAt": "2025-12-24 00:00:00",
        "promoEndAt": "2025-12-31 23:59:59",
        "salePrice": "79.90",
        "promoActive": true,
        "followers": 12000,
        "likes": 58000,
        "isRealName": true,
        "mainImage": "https://...",
        "status": "online",
        "createdAt": "2025-12-22 12:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

## 2. 商品详情

`GET /api/c/products/:id`

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "小红薯1号 - 美妆博主",
    "category": "xiaohongshuo",
    "price": "99.90",
    "originalPrice": "199.00",
    "promoPrice": "79.90",
    "promoStartAt": "2025-12-24 00:00:00",
    "promoEndAt": "2025-12-31 23:59:59",
    "salePrice": "79.90",
    "promoActive": true,
    "followers": 12000,
    "likes": 58000,
    "isRealName": true,
    "description": "简介",
    "detailedIntro": "<p>富文本</p>",
    "usageInstructions": "<p>富文本</p>",
    "mainImage": "https://...",
    "screenshot": "https://...",
    "galleryImages": ["https://..."],
    "status": "online",
    "createdAt": "2025-12-22 12:00:00"
  }
}
```
