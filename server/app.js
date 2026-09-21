const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { getDb } = require('./db');
const { getOrCreateSession } = require('./session');
const verificationService = require('./verification');
const { FILES_CATALOG, verifyAndConsumeDownloadToken, streamProtectedFile } = require('./files-service');

const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// Rate limiter đơn giản theo session
const rateLimitMap = new Map();
function isRateLimited(key, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || [];
  const validTimestamps = entry.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    return true;
  }
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return false;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100000) { // 100KB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(json);
}

function createServer() {
  return http.createServer(async (req, res) => {
    // Thêm các headers an toàn cơ bản
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Lấy hoặc tạo phiên khách an toàn
    const sessionId = getOrCreateSession(req, res);

    try {
      // 1. API: Kiểm tra trạng thái hệ thống
      if (pathname === '/api/status' && method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          platforms: {
            telegram: {
              configured: config.telegram.isConfigured,
              botUsername: config.telegram.botUsername,
              groupLink: config.telegram.groupLink
            },
            discord: {
              configured: config.discord.isConfigured,
              serverLink: config.discord.serverLink
            }
          },
          files: Object.values(FILES_CATALOG).map(f => ({
            id: f.id,
            filename: f.filename,
            displayName: f.displayName,
            description: f.description
          }))
        });
      }

      // 2. API: Khởi tạo phiên xác minh (POST /api/verify/start)
      if (pathname === '/api/verify/start' && method === 'POST') {
        if (isRateLimited(`verify_start_${sessionId}`, 20, 60000)) {
          return sendJson(res, 429, { error: 'Thao tác quá nhanh. Vui lòng chờ giây lát rồi thử lại.' });
        }

        const body = await parseJsonBody(req);
        const { fileId, platform } = body;

        if (!fileId || !platform) {
          return sendJson(res, 400, { error: 'Thiếu fileId hoặc platform' });
        }

        const result = verificationService.startVerification(sessionId, fileId, platform);
        return sendJson(res, 200, { success: true, ...result });
      }

      // 3. API: Lấy trạng thái phiên xác minh (GET /api/verify/status)
      if (pathname === '/api/verify/status' && method === 'GET') {
        const requestId = parsedUrl.searchParams.get('requestId');
        if (!requestId) {
          return sendJson(res, 400, { error: 'Thiếu requestId' });
        }

        const statusData = verificationService.getVerificationStatus(sessionId, requestId);
        if (!statusData.found) {
          return sendJson(res, 404, { error: statusData.error });
        }

        return sendJson(res, 200, { success: true, ...statusData });
      }

      // 4. API: Kiểm tra lại thành viên thủ công (POST /api/verify/check)
      if (pathname === '/api/verify/check' && method === 'POST') {
        if (isRateLimited(`verify_check_${sessionId}`, 15, 30000)) {
          return sendJson(res, 429, { error: 'Vui lòng chờ ít nhất 2 giây giữa các lần bấm kiểm tra lại.' });
        }

        const body = await parseJsonBody(req);
        const { requestId } = body;
        if (!requestId) {
          return sendJson(res, 400, { error: 'Thiếu requestId' });
        }

        const result = await verificationService.recheckMembership(sessionId, requestId);
        return sendJson(res, 200, { success: true, ...result });
      }

      // 5. API: Hủy phiên xác minh (POST /api/verify/cancel)
      if (pathname === '/api/verify/cancel' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { requestId } = body;
        if (!requestId) {
          return sendJson(res, 400, { error: 'Thiếu requestId' });
        }

        const result = verificationService.cancelVerification(sessionId, requestId);
        return sendJson(res, 200, result);
      }

      // 6. OAuth2 Callback Discord (GET /auth/discord/callback)
      if (pathname === '/auth/discord/callback' && method === 'GET') {
        const code = parsedUrl.searchParams.get('code');
        const state = parsedUrl.searchParams.get('state');
        const error = parsedUrl.searchParams.get('error');
        const errorDesc = parsedUrl.searchParams.get('error_description');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Xác thực Discord bị từ chối</title>
            <style>body{background:#050716;color:#fff;font-family:sans-serif;text-align:center;padding:40px;}</style>
            </head>
            <body>
              <h2>⚠️ Xác thực Discord không thành công</h2>
              <p>${errorDesc || error}</p>
              <button onclick="window.close();">Đóng cửa sổ này</button>
            </body>
            </html>
          `);
        }

        if (!code || !state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end('<h3>Thiếu tham số code hoặc state từ Discord.</h3>');
        }

        try {
          const cbResult = await verificationService.handleDiscordCallback(code, state, sessionId);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Đã liên kết Discord</title>
            <style>
              body{background:#050716;color:#f1f5f9;font-family:sans-serif;text-align:center;padding:50px 20px;}
              .card{max-width:420px;margin:0 auto;background:#0d1334;border:1px solid #22d3ee;padding:30px;border-radius:20px;}
              h2{color:#38bdf8;}
            </style>
            </head>
            <body>
              <div class="card">
                <h2>✦ Đã liên kết Discord thành công! ✦</h2>
                <p>Hệ thống đã nhận diện tài khoản Discord của bạn.</p>
                <p>Cửa sổ này sẽ tự đóng trong giây lát...</p>
              </div>
              <script>
                if (window.opener) {
                  try { window.opener.postMessage({ type: 'DISCORD_AUTH_COMPLETE', requestId: '${cbResult.requestId}' }, '*'); } catch(e){}
                }
                setTimeout(() => {
                  try { window.close(); } catch(e) { window.location.href = '/index.html'; }
                }, 1500);
              </script>
            </body>
            </html>
          `);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`<h3>Lỗi xử lý Discord callback:</h3><p>${err.message}</p>`);
        }
      }

      // 7. API Tải file an toàn (GET /api/download)
      if (pathname === '/api/download' && method === 'GET') {
        const token = parsedUrl.searchParams.get('token');
        const db = getDb();

        // Kiểm tra và tiêu thụ token nguyên tử
        const consumeResult = verifyAndConsumeDownloadToken(db, token, sessionId);
        if (!consumeResult.valid) {
          res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Lỗi tải file</title>
            <style>body{background:#050716;color:#fb7185;font-family:sans-serif;text-align:center;padding:50px;}</style>
            </head>
            <body>
              <h2>⛔ Không thể tải file</h2>
              <p>${consumeResult.error}</p>
              <a href="/index.html" style="color:#38bdf8;">← Quay lại Trang Chủ</a>
            </body>
            </html>
          `);
        }

        // Re-check thành viên lần cuối ngay trước khi bắt đầu stream file
        const preCheck = await verificationService.preDownloadCheck(
          sessionId, 
          consumeResult.fileId, 
          consumeResult.verificationId
        );

        if (!preCheck.ok) {
          res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Quyền tải bị thu hồi</title>
            <style>body{background:#050716;color:#fb7185;font-family:sans-serif;text-align:center;padding:50px;}</style>
            </head>
            <body>
              <h2>⛔ Quyền tải file bị từ chối</h2>
              <p>${preCheck.error}</p>
              <a href="/index.html" style="color:#38bdf8;">← Bấm vào đây để xác minh lại</a>
            </body>
            </html>
          `);
        }

        // Stream file nhị phân an toàn
        return streamProtectedFile(consumeResult.fileId, res);
      }

      // 8. Phục vụ Static Files
      if (method === 'GET' || method === 'HEAD') {
        let reqPath = decodeURIComponent(pathname);
        if (reqPath === '/') reqPath = '/index.html';

        // Ngăn Path Traversal & chặn truy cập các thư mục nhạy cảm
        const forbiddenPrefixes = ['/protected_files', '/data', '/server', '/tests', '/.git', '/.env'];
        if (forbiddenPrefixes.some(p => reqPath.startsWith(p)) || reqPath.includes('..')) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('403 Forbidden');
        }

        const fullPath = path.join(ROOT_DIR, reqPath);

        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end('<h2>404 Not Found</h2><p><a href="/index.html">Về trang chủ</a></p>');
        }

        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
        });

        if (method === 'HEAD') {
          return res.end();
        }

        return fs.createReadStream(fullPath).pipe(res);
      }

      // Phương thức HTTP không hỗ trợ
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');

    } catch (err) {
      console.error('[Server Request Error]:', err);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
      }
    }
  });
}

module.exports = {
  createServer
};
