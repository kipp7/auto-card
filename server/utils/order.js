function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateOrderNo() {
  return `ORD${Date.now()}${randomString(8)}`;
}

module.exports = {
  generateOrderNo,
};

