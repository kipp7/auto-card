const { getJsonSetting, setJsonSetting } = require('./settings');

const FULL_REDUCTION_KEY = 'full_reduction_rule';
const DEFAULT_RULE = {
  enabled: false,
  threshold: 0,
  reduce: 0,
};

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function normalizeFullReductionRule(input = {}) {
  const threshold = normalizeNumber(input.threshold, DEFAULT_RULE.threshold);
  const reduce = normalizeNumber(input.reduce, DEFAULT_RULE.reduce);
  return {
    enabled: Boolean(input.enabled),
    threshold,
    reduce: reduce > threshold ? threshold : reduce,
  };
}

async function getFullReductionRule() {
  const raw = await getJsonSetting(FULL_REDUCTION_KEY, DEFAULT_RULE);
  return normalizeFullReductionRule(raw);
}

async function saveFullReductionRule(payload) {
  const rule = normalizeFullReductionRule(payload || {});
  await setJsonSetting(FULL_REDUCTION_KEY, rule);
  return rule;
}

function calcFullReductionDiscount(amount, rule) {
  const price = normalizeNumber(amount, 0);
  if (!rule || !rule.enabled) return 0;
  if (price < Number(rule.threshold || 0)) return 0;
  const discount = Number(rule.reduce || 0);
  if (!discount) return 0;
  return Math.min(price, discount);
}

module.exports = {
  getFullReductionRule,
  saveFullReductionRule,
  calcFullReductionDiscount,
};
