const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function request(path, options) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(`[${res.status}] ${url} ${json ? json.message : text}`);
  }
  return json ?? text;
}

async function main() {
  console.log('BASE_URL:', BASE_URL);

  console.log('GET /');
  await request('/');

  console.log('GET /api/c/products');
  const products = await request('/api/c/products?page=1&pageSize=5');
  console.log('products.total:', products?.data?.total);

  console.log('GET /api/c/announcements');
  await request('/api/c/announcements?page=1&pageSize=1');

  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
