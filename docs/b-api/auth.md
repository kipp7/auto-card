# B端鉴权 API

## 1. 登录

`POST /api/b/auth/login`

### 请求体

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### 响应体

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "username": "admin",
    "token": "BearerToken"
  }
}
```

## 2. 获取当前管理员

`GET /api/b/auth/me`

Header：`Authorization: Bearer <token>`

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1,
    "username": "admin"
  }
}
```

