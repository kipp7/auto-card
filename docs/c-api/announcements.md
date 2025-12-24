# C端公告 API

## 1. 公告列表

`GET /api/c/announcements`

### Query 参数

- `page`：页码（默认 1）
- `pageSize`：每页数量（默认 10）

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "网站公告",
        "content": "<p>公告内容</p>",
        "status": "published",
        "sort": 0,
        "createdAt": "2025-12-22 12:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

