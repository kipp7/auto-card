# B端用户管理 API

> 说明：管理端用户管理用于管理 C 端用户（以及管理员账户的启用/禁用），字段均为 `camelCase`。

## 1. 用户列表

`GET /api/b/users`

### Query 参数

- `page`（默认 1）
- `pageSize`（默认 20）
- `username`（模糊匹配）
- `type`（admin/mobile）
- `status`（enabled/disabled）
- `sortBy`（createdAt/username）
- `sortOrder`（asc/desc）

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "username": "admin",
        "type": "admin",
        "status": "enabled",
        "createdAt": "2025-12-22 12:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

## 2. 用户详情

`GET /api/b/users/:id`

## 3. 编辑用户

`PUT /api/b/users/:id`

请求体示例：

```json
{
  "status": "disabled"
}
```

## 4. 启用/禁用

`PATCH /api/b/users/:id/status`

```json
{
  "status": "enabled"
}
```

## 5. 删除

`DELETE /api/b/users/:id`

