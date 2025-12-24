function apiSuccess(res, data = null, message = 'success') {
  res.json({ code: 0, message, data });
}

function apiError(res, httpStatus = 500, message = 'error', code = httpStatus) {
  res.status(httpStatus).json({ code, message, data: null });
}

module.exports = {
  apiSuccess,
  apiError,
};

