# C端鉴权 API

## 1. 注册

`POST /api/c/auth/register`

### 请求体

```json
{
  "username": "test123",
  "password": "test123"
}
```

### 响应体

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "userId": 1,
    "username": "test123",
    "token": "BearerToken"
  }
}
```

## 2. 登录

`POST /api/c/auth/login`

### 请求体

```json
{
  "username": "test123",
  "password": "test123"
}
```

### 响应体

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "username": "test123",
    "token": "BearerToken"
  }
}
```

## 3. 获取当前用户

`GET /api/c/auth/me`

Header：`Authorization: Bearer <token>`

### 响应体

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1,
    "username": "test123"
  }
}
```

