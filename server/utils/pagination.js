function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function parsePagination(query, defaults = { page: 1, pageSize: 20, maxPageSize: 100 }) {
  const page = Math.max(1, toInt(query.page, defaults.page));
  const pageSize = Math.min(defaults.maxPageSize, Math.max(1, toInt(query.pageSize, defaults.pageSize)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

module.exports = {
  parsePagination,
};

