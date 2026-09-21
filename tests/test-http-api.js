const http = require('node:http');
const assert = require('node:assert');
const { initDb } = require('../server/db');
const { createServer } = require('../server/app');

async function testHttpApi() {
  console.log('--- KHỞI CHẠY KIỂM THỬ TÍCH HỢP HTTP API ---');

  initDb(':memory:');
  const server = createServer();

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { ...headers };
      let payload = null;

      if (body) {
        payload = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(url, { method, headers: reqHeaders }, res => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          let data = null;
          try { data = JSON.parse(resBody); } catch (e) { data = resBody; }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Test GET /api/status
    const statusRes = await request('GET', '/api/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.success, true);
    assert.ok(statusRes.headers['set-cookie'], 'Must set tx_session cookie');
    const cookie = statusRes.headers['set-cookie'][0].split(';')[0];
    console.log('✓ [HTTP 1] GET /api/status trả về 200 và cấp session cookie');

    // 2. Test Chặn truy cập file nhạy cảm
    const forbiddenEnv = await request('GET', '/.env', null, { Cookie: cookie });
    assert.strictEqual(forbiddenEnv.status, 403);
    console.log('✓ [HTTP 2] Chặn trực tiếp /.env trả về 403 Forbidden');

    const forbiddenData = await request('GET', '/data/app.db', null, { Cookie: cookie });
    assert.strictEqual(forbiddenData.status, 403);
    console.log('✓ [HTTP 3] Chặn trực tiếp /data/app.db trả về 403 Forbidden');

    const forbiddenProtected = await request('GET', '/protected_files/KURO-v2.2.2h.apk', null, { Cookie: cookie });
    assert.strictEqual(forbiddenProtected.status, 403);
    console.log('✓ [HTTP 4] Chặn tải trực tiếp trong /protected_files trả về 403 Forbidden');

    // 3. Test tải không có token
    const badDownload = await request('GET', '/api/download?token=fake_token', null, { Cookie: cookie });
    assert.strictEqual(badDownload.status, 403);
    console.log('✓ [HTTP 5] Tải bằng token không tồn tại trả về 403 Forbidden');

    // 4. Test Static file hợp lệ (index.html)
    const indexRes = await request('GET', '/index.html', null, { Cookie: cookie });
    assert.strictEqual(indexRes.status, 200);
    assert.ok(String(indexRes.body).includes('Tundenxin'));
    console.log('✓ [HTTP 6] Tải trang index.html trả về 200 OK');

    console.log('✦ TOÀN BỘ 6 BÀI KIỂM THỬ HTTP API ĐỀU PASS THÀNH CÔNG ✦\n');
  } finally {
    server.close();
  }
}

testHttpApi().catch(err => {
  console.error('HTTP API Test Lỗi:', err);
  process.exit(1);
});
