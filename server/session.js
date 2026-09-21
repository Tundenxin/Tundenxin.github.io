const crypto = require('node:crypto');
const config = require('./config');
const { getDb } = require('./db');

const COOKIE_NAME = 'tx_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 ngày

function signSessionId(sessionId) {
  const hmac = crypto.createHmac('sha256', config.sessionSecret);
  hmac.update(sessionId);
  return hmac.digest('base64url');
}

function verifySessionSignature(sessionId, signature) {
  if (!sessionId || !signature) return false;
  const expectedSig = signSessionId(sessionId);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    if (name) list[name] = value;
  });

  return list;
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function getOrCreateSession(req, res, customDb = null) {
  const db = customDb || getDb();
  const cookies = parseCookies(req);
  const rawCookie = cookies[COOKIE_NAME];
  const now = Date.now();

  let sessionId = null;

  if (rawCookie) {
    const dotIdx = rawCookie.indexOf('.');
    if (dotIdx > 0) {
      const idPart = rawCookie.slice(0, dotIdx);
      const sigPart = rawCookie.slice(dotIdx + 1);

      if (verifySessionSignature(idPart, sigPart)) {
        // Kiểm tra session có trong database không
        const row = db.prepare('SELECT id FROM sessions WHERE id = ?').get(idPart);
        if (row) {
          sessionId = idPart;
          // Cập nhật thời điểm hoạt động
          db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?').run(now, sessionId);
        }
      }
    }
  }

  // Nếu chưa có session hoặc session không hợp lệ, tạo session mới
  if (!sessionId) {
    sessionId = generateSessionId();
    db.prepare('INSERT INTO sessions (id, created_at, last_active_at) VALUES (?, ?, ?)')
      .run(sessionId, now, now);

    const sig = signSessionId(sessionId);
    const cookieValue = `${sessionId}.${sig}`;
    
    // Đặt cookie HttpOnly, SameSite=Lax
    const cookieParts = [
      `${COOKIE_NAME}=${cookieValue}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`
    ];
    
    // Nếu request chạy qua HTTPS thì bật cờ Secure
    if (req.headers['x-forwarded-proto'] === 'https' || (req.socket && req.socket.encrypted)) {
      cookieParts.push('Secure');
    }

    res.setHeader('Set-Cookie', cookieParts.join('; '));
  }

  return sessionId;
}

module.exports = {
  COOKIE_NAME,
  signSessionId,
  verifySessionSignature,
  getOrCreateSession
};
