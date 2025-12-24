const crypto = require('crypto');
const express = require('express');

const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/async-handler');
const { apiError, apiSuccess } = require('../../utils/response');

const router = express.Router();

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signQiniuUploadToken({ accessKey, secretKey, bucket, expiresInSeconds }) {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const putPolicy = JSON.stringify({ scope: bucket, deadline });
  const encodedPutPolicy = base64UrlEncode(putPolicy);

  const sign = crypto.createHmac('sha1', secretKey).update(encodedPutPolicy).digest();
  const encodedSign = base64UrlEncode(sign);
  return `${accessKey}:${encodedSign}:${encodedPutPolicy}`;
}

router.get('/upload-token', requireAuth({ types: ['admin'] }), asyncHandler(async (req, res) => {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET;
  const domain = process.env.QINIU_DOMAIN;
  const uploadUrl = process.env.QINIU_UPLOAD_URL || 'https://upload.qiniup.com';

  if (!accessKey || !secretKey || !bucket || !domain) {
    return apiError(res, 400, '未配置七牛云（QINIU_ACCESS_KEY/QINIU_SECRET_KEY/QINIU_BUCKET/QINIU_DOMAIN）');
  }

  const keyPrefix = (req.query.prefix ? String(req.query.prefix) : 'products/').replace(/^\/+/, '');
  const token = signQiniuUploadToken({
    accessKey,
    secretKey,
    bucket,
    expiresInSeconds: 3600,
  });

  return apiSuccess(res, {
    uploadUrl,
    domain,
    keyPrefix,
    token,
  });
}));

module.exports = router;
