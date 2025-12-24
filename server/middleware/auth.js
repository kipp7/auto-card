const { apiError } = require('../utils/response');
const { getBearerToken, verifyJwt } = require('../utils/jwt');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

function parseAuthUser(req) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;

  const payload = verifyJwt(token, getJwtSecret());
  if (!payload) return null;

  if (!payload.id || !payload.username || !payload.type) return null;
  return {
    id: payload.id,
    username: payload.username,
    type: payload.type,
  };
}

function requireAuth(options = {}) {
  const allowedTypes = options.types || null;

  return (req, res, next) => {
    const user = parseAuthUser(req);
    if (!user) return apiError(res, 401, '未登录或登录已过期');
    if (Array.isArray(allowedTypes) && !allowedTypes.includes(user.type)) {
      return apiError(res, 403, '无权限访问');
    }
    req.user = user;
    return next();
  };
}

function optionalAuth(options = {}) {
  const allowedTypes = options.types || null;

  return (req, res, next) => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) return next();

    const payload = verifyJwt(token, getJwtSecret());
    if (!payload) return apiError(res, 401, '未登录或登录已过期');
    if (!payload.id || !payload.username || !payload.type) return apiError(res, 401, '未登录或登录已过期');
    if (Array.isArray(allowedTypes) && !allowedTypes.includes(payload.type)) {
      return apiError(res, 403, '无权限访问');
    }

    req.user = { id: payload.id, username: payload.username, type: payload.type };
    return next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
};

