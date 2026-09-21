const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const PROTECTED_DIR = path.resolve(__dirname, '..', 'protected_files');

const FILES_CATALOG = {
  'kuro': {
    id: 'kuro',
    filename: 'KURO-v2.2.2h.apk',
    displayName: 'Kuro.apk',
    description: 'Tool Genshin Impact Mobile Kuro v2.2.2h',
    contentType: 'application/vnd.android.package-archive',
    fallbackRemoteUrl: 'https://github.com/4firas/Kuro-GI/releases/download/v2.2.2h/KURO-v2.2.2h.apk'
  },
  'dmshby': {
    id: 'dmshby',
    filename: 'DMSHBY.sh',
    displayName: 'DMSHBY.sh',
    description: 'Script Genshin Impact Mobile DMSHBY',
    contentType: 'application/x-sh',
    fallbackRemoteUrl: 'https://mega.nz/file/G6p2yAID#DyTnCl2SFMIBShvaEBE5tFV7MDCGMdxPkEbmOr6DW18'
  },
  'yukino': {
    id: 'yukino',
    filename: 'Yukino.apk',
    displayName: 'Yukino.apk',
    description: 'Tool Genshin Impact Mobile Yukino',
    contentType: 'application/vnd.android.package-archive',
    fallbackRemoteUrl: 'https://mega.nz/file/jz4VHLRA#yOs0w6hPuQbKFQo8x1nuQwov805NanQEYDBPBfMskKs'
  },
  'eleutheria': {
    id: 'eleutheria',
    filename: 'Eleutheria.apk',
    displayName: 'Eleutheria.apk',
    description: 'Tool Genshin Impact Mobile Eleutheria',
    contentType: 'application/vnd.android.package-archive',
    fallbackRemoteUrl: 'https://t.me/BoxToolGS_VN'
  }
};

function ensureSampleFiles() {
  if (!fs.existsSync(PROTECTED_DIR)) {
    fs.mkdirSync(PROTECTED_DIR, { recursive: true });
  }

  // Tạo sẵn các file mẫu nếu chưa có trong thư mục protected_files
  for (const [id, item] of Object.entries(FILES_CATALOG)) {
    const filePath = path.join(PROTECTED_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      const sampleBanner = `# Tundenxin Protected File Package\n` +
        `# File: ${item.filename}\n` +
        `# Tool: ${item.displayName}\n` +
        `# Verified Download via Tundenxin Gatekeeper System.\n` +
        `# Timestamp: ${new Date().toISOString()}\n`;
      fs.writeFileSync(filePath, sampleBanner, 'utf8');
    }
  }
}

function getFileInfo(fileId) {
  return FILES_CATALOG[fileId] || null;
}

function createDownloadToken(db, sessionId, fileId, verificationId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = now + (config.downloadTokenExpireSeconds * 1000);

  db.prepare(`
    INSERT INTO download_tokens (token, session_id, file_id, verification_id, expires_at, used_at, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
  `).run(token, sessionId, fileId, verificationId, expiresAt, now);

  return {
    token,
    expiresAt,
    expiresInSeconds: config.downloadTokenExpireSeconds,
    downloadUrl: `/api/download?token=${token}`
  };
}

function verifyAndConsumeDownloadToken(db, token, sessionId) {
  if (!token) {
    return { valid: false, error: 'Thiếu mã tải file (download token).' };
  }

  const now = Date.now();

  // Chạy giao dịch nguyên tử kiểm tra và tiêu thụ token
  db.exec('BEGIN TRANSACTION;');
  try {
    const row = db.prepare(`
      SELECT * FROM download_tokens WHERE token = ?
    `).get(token);

    if (!row) {
      db.exec('ROLLBACK;');
      return { valid: false, error: 'Mã tải file không tồn tại hoặc không hợp lệ.' };
    }

    if (row.session_id !== sessionId) {
      db.exec('ROLLBACK;');
      return { valid: false, error: 'Mã tải file không thuộc về phiên làm việc này.' };
    }

    if (row.used_at) {
      db.exec('ROLLBACK;');
      return { valid: false, error: 'Mã tải file này đã được sử dụng trước đó (mỗi mã chỉ dùng được một lần).' };
    }

    if (row.expires_at < now) {
      db.exec('ROLLBACK;');
      return { valid: false, error: 'Mã tải file đã hết hạn hiệu lực. Vui lòng xác minh lại.' };
    }

    // Đánh dấu đã tiêu thụ
    db.prepare(`
      UPDATE download_tokens SET used_at = ? WHERE token = ?
    `).run(now, token);

    db.exec('COMMIT;');
    return {
      valid: true,
      fileId: row.file_id,
      verificationId: row.verification_id
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function streamProtectedFile(fileId, res) {
  const fileInfo = getFileInfo(fileId);
  if (!fileInfo) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Không tìm thấy file yêu cầu' }));
    return;
  }

  ensureSampleFiles();
  const filePath = path.join(PROTECTED_DIR, fileInfo.filename);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Tệp tin không tồn tại trên hệ thống máy chủ' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const encodedFilename = encodeURIComponent(fileInfo.filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

  res.writeHead(200, {
    'Content-Type': fileInfo.contentType || 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${fileInfo.filename}"; filename*=UTF-8''${encodedFilename}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Content-Type-Options': 'nosniff'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

module.exports = {
  FILES_CATALOG,
  ensureSampleFiles,
  getFileInfo,
  createDownloadToken,
  verifyAndConsumeDownloadToken,
  streamProtectedFile
};
