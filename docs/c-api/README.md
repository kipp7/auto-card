# C端 API（用户端）

## 通用约定

- Base URL：`http://localhost:3000`
- 统一响应：
  - 成功：`{ "code": 0, "message": "success", "data": ... }`
  - 失败：`{ "code": 400/401/403/404/500, "message": "错误信息", "data": null }`
- 时间字段：统一格式 `YYYY-MM-DD HH:mm:ss`
- 鉴权：请求头 `Authorization: Bearer <token>`（部分接口可匿名）

## 文档

- `docs/c-api/auth.md`
- `docs/c-api/products.md`
- `docs/c-api/announcements.md`
- `docs/c-api/orders.md`

