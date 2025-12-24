# B端 API（管理端）

## 通用约定

- Base URL：`http://localhost:3000`
- 统一响应：
  - 成功：`{ "code": 0, "message": "success", "data": ... }`
  - 失败：`{ "code": 400/401/403/404/500, "message": "错误信息", "data": null }`
- 时间字段：统一格式 `YYYY-MM-DD HH:mm:ss`
- 鉴权：请求头 `Authorization: Bearer <token>`（登录后获取）

## 文档

- `docs/b-api/auth.md`
- `docs/b-api/users.md`
- `docs/b-api/products.md`
- `docs/b-api/orders.md`
- `docs/b-api/announcements.md`
- `docs/b-api/dashboard.md`
- `docs/b-api/finance.md`
- `docs/b-api/upload.md`

