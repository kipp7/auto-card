# B端上传（七牛云）API

> 说明：推荐「前端直传七牛」，后端仅负责签发上传凭证与返回上传域名。

## 1. 获取上传 Token

`GET /api/b/qiniu/upload-token`

### Query 参数

- `prefix`：对象 key 前缀（默认 `products/`）

### 响应体示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uploadUrl": "https://upload.qiniup.com",
    "domain": "http://your-cdn-domain.com",
    "keyPrefix": "products/",
    "token": "QiniuUploadToken"
  }
}
```

