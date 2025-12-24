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

async function main() {
  console.log('BASE_URL:', BASE_URL);

  const admin = await api('/api/b/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert(admin && admin.token, 'admin login failed');

  const uniq = Date.now();
  const product = await api('/api/b/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(admin.token) },
    body: JSON.stringify({
      name: `Smoke商品-${uniq}`,
      category: 'smoke',
      price: '1.00',
      status: 'online',
      cardNumber: `account-${uniq}----password-${uniq}`,
      followers: 0,
      likes: 0,
      isRealName: false,
    }),
  });
  assert(product && product.id, 'create product failed');

  const buyerPhone = '13800138000';
  const order1 = await api('/api/c/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, buyerPhone, paymentMethod: 'wechat' }),
  });
  assert(order1 && order1.orderId, 'create order failed');

  const detail1 = await api(`/api/c/orders/${order1.orderId}?buyerPhone=${encodeURIComponent(buyerPhone)}`);
  assert(typeof detail1.expiresInSeconds === 'number', 'order detail should include expiresInSeconds');

  let locked = false;
  try {
    await api('/api/c/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, buyerPhone, paymentMethod: 'wechat' }),
    });
  } catch (err) {
    locked = true;
    console.log('Expected lock error:', err.message);
  }
  assert(locked, 'expected second order to be blocked');

  await api(`/api/c/orders/${order1.orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerPhone }),
  });

  const order2 = await api('/api/c/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, buyerPhone, paymentMethod: 'wechat' }),
  });
  assert(order2 && order2.orderId, 'expected product to be released after cancel');

  await api(`/api/b/orders/${order1.orderId}`, { method: 'DELETE', headers: authHeaders(admin.token) });
  await api(`/api/b/orders/${order2.orderId}`, { method: 'DELETE', headers: authHeaders(admin.token) });
  await api(`/api/b/products/${product.id}`, { method: 'DELETE', headers: authHeaders(admin.token) });

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
