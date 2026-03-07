/**
 * Simple test script for the Products API.
 * Run with: node test.js
 *
 * Requires the server to be running on port 3000 (or set PORT env var).
 */

const http = require('http');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

let testsPassed = 0;
let testsFailed = 0;
let createdProductId = null;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  PASS: ${message}`);
  } else {
    testsFailed++;
    console.log(`  FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('=== Products API Tests ===\n');

  // Test 1: Health check
  console.log('1. Health check');
  const health = await request('GET', '/api/health');
  assert(health.status === 200, 'Health returns 200');
  assert(health.body.status === 'ok', 'Health status is ok');

  // Test 2: List products (seeded data)
  console.log('\n2. List products');
  const list = await request('GET', '/api/products');
  assert(list.status === 200, 'List returns 200');
  assert(Array.isArray(list.body.data), 'Returns data array');
  assert(list.body.meta.total >= 3, 'Has seeded products');

  // Test 3: Create a product
  console.log('\n3. Create product');
  const createRes = await request('POST', '/api/products', {
    name: 'Test Widget',
    description: 'A test product',
    price: 29.99,
    category: 'Testing',
    stock: 100,
  });
  assert(createRes.status === 201, 'Create returns 201');
  assert(createRes.body.data.name === 'Test Widget', 'Name matches');
  assert(createRes.body.data.price === 29.99, 'Price matches');
  assert(createRes.body.data.id !== undefined, 'Has generated ID');
  createdProductId = createRes.body.data.id;

  // Test 4: Get single product
  console.log('\n4. Get single product');
  const getRes = await request('GET', `/api/products/${createdProductId}`);
  assert(getRes.status === 200, 'Get returns 200');
  assert(getRes.body.data.id === createdProductId, 'ID matches');

  // Test 5: Update product (PUT)
  console.log('\n5. Full update (PUT)');
  const putRes = await request('PUT', `/api/products/${createdProductId}`, {
    name: 'Updated Widget',
    description: 'Updated description',
    price: 39.99,
    category: 'Testing',
    stock: 50,
  });
  assert(putRes.status === 200, 'PUT returns 200');
  assert(putRes.body.data.name === 'Updated Widget', 'Name updated');
  assert(putRes.body.data.price === 39.99, 'Price updated');

  // Test 6: Partial update (PATCH)
  console.log('\n6. Partial update (PATCH)');
  const patchRes = await request('PATCH', `/api/products/${createdProductId}`, {
    price: 49.99,
  });
  assert(patchRes.status === 200, 'PATCH returns 200');
  assert(patchRes.body.data.price === 49.99, 'Price patched');
  assert(patchRes.body.data.name === 'Updated Widget', 'Name unchanged');

  // Test 7: Delete product
  console.log('\n7. Delete product');
  const delRes = await request('DELETE', `/api/products/${createdProductId}`);
  assert(delRes.status === 204, 'DELETE returns 204');

  // Test 8: Get deleted product returns 404
  console.log('\n8. Get deleted product');
  const getDeleted = await request('GET', `/api/products/${createdProductId}`);
  assert(getDeleted.status === 404, 'Deleted product returns 404');

  // Test 9: Validation errors
  console.log('\n9. Validation');
  const badCreate = await request('POST', '/api/products', { price: -5 });
  assert(badCreate.status === 400, 'Invalid product returns 400');

  // Test 10: Filter by category
  console.log('\n10. Filter by category');
  const filtered = await request('GET', '/api/products?category=Electronics');
  assert(filtered.status === 200, 'Filter returns 200');
  assert(
    filtered.body.data.every((p) => p.category.toLowerCase() === 'electronics'),
    'All results match category'
  );

  // Summary
  console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test error:', err.message);
  console.log('Make sure the server is running: npm start');
  process.exit(1);
});
