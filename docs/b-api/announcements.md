# B端公告管理 API

## 1. 公告列表

`GET /api/b/announcements`

### Query 参数

- `page`（默认 1）
- `pageSize`（默认 20）
- `title`（模糊匹配）
- `status`（published/draft）
- `sortBy`（sort/createdAt）
- `sortOrder`（asc/desc）

## 2. 公告详情

`GET /api/b/announcements/:id`

## 3. 创建公告

`POST /api/b/announcements`

```json
{
  "title": "网站公告",
  "content": "<p>公告内容</p>",
  "status": "published",
  "sort": 0
}
```

## 4. 编辑公告

`PUT /api/b/announcements/:id`

## 5. 修改状态

`PATCH /api/b/announcements/:id/status`

```json
{
  "status": "draft"
}
```

## 6. 删除公告

`DELETE /api/b/announcements/:id`

