const { query, queryOne } = require('./db');

async function getSetting(key) {
  const row = await queryOne('SELECT setting_value AS value FROM settings WHERE setting_key = ? LIMIT 1', [key]);
  return row ? row.value : null;
}

async function setSetting(key, value) {
  await query(
    `
      INSERT INTO settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [key, value],
  );
}

async function getJsonSetting(key, fallback) {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function setJsonSetting(key, value) {
  const raw = JSON.stringify(value || {});
  await setSetting(key, raw);
}

module.exports = {
  getSetting,
  setSetting,
  getJsonSetting,
  setJsonSetting,
};
