const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(`[${res.status}] ${url} ${json ? json.message : text}`);
  }

  if (json && typeof json.code === 'number') {
    if (json.code !== 0) throw new Error(`[${json.code}] ${url} ${json.message}`);
    return json.data;
  }

  return json ?? text;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds())
  );
}

async function main() {
  console.log('BASE_URL:', BASE_URL);

  const admin = await api('/api/b/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert(admin && admin.token, 'admin login failed');

  await api('/api/b/finance/full-reduction', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(admin.token) },
    body: JSON.stringify({ enabled: true, threshold: 50, reduce: 10 }),
  });

  const now = Date.now();
  const promoStartAt = formatDateTime(new Date(now - 60 * 60 * 1000));
  const promoEndAt = formatDateTime(new Date(now + 60 * 60 * 1000));
  const uniq = Date.now();
  const product = await api('/api/b/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(admin.token) },
    body: JSON.stringify({
      name: `SmokeCard-${uniq}`,
      category: 'smoke',
      price: '80.00',
      promoPrice: '60.00',
      promoStartAt,
      promoEndAt,
      status: 'online',
      cardNumber: `seed-${uniq}`,
      followers: 0,
      likes: 0,
      isRealName: false,
      maleRatio: 50,
      femaleRatio: 50,
    }),
  });
  assert(product && product.id, 'create product failed');

  const longCard = 'L'.repeat(600);
  const importRes = await api(`/api/b/products/${product.id}/stock/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(admin.token) },
    body: JSON.stringify({
      cardsText: `card-1\ncard-1\n${longCard}\ncard-2`,
    }),
  });
  assert(importRes.summary && importRes.summary.duplicate === 1, 'expected duplicate summary');
  assert(importRes.summary && importRes.summary.invalid === 1, 'expected invalid summary');

  const buyerPhone = '13800138001';
  const order = await api('/api/c/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, buyerPhone, paymentMethod: 'wechat' }),
  });
  assert(order && order.orderId, 'create order failed');
  assert(Number(order.originalAmount) === 60, 'expected originalAmount from promo price');
  assert(Number(order.discountAmount) === 10, 'expected discountAmount from full reduction');
  assert(Number(order.orderAmount) === 50, 'expected orderAmount after discount');

  await api(`/api/c/orders/${order.orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerPhone }),
  });

  await api(`/api/b/orders/${order.orderId}`, { method: 'DELETE', headers: authHeaders(admin.token) });
  await api(`/api/b/products/${product.id}`, { method: 'DELETE', headers: authHeaders(admin.token) });

  await api('/api/b/finance/full-reduction', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(admin.token) },
    body: JSON.stringify({ enabled: false, threshold: 0, reduce: 0 }),
  });

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
