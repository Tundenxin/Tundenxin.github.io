const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

let dbInstance = null;

function initDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  let dbPath = customPath;
  if (!dbPath) {
    const dataDir = path.resolve(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'app.db');
  }

  const db = new DatabaseSync(dbPath);

  // Cấu hình PRAGMA tối ưu hóa hiệu năng và toàn vẹn dữ liệu
  if (dbPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      // WAL có thể không hỗ trợ trên một số hệ thống file đặc thù
    }
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // Khởi tạo các bảng
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      target_id TEXT NOT NULL,
      link_token TEXT UNIQUE,
      link_token_expires_at INTEGER,
      platform_user_id TEXT,
      platform_username TEXT,
      platform_display_name TEXT,
      invite_link TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      last_checked_at INTEGER,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_vr_session_file 
      ON verification_requests(session_id, file_id, status);

    CREATE INDEX IF NOT EXISTS idx_vr_link_token 
      ON verification_requests(link_token);

    CREATE INDEX IF NOT EXISTS idx_vr_platform_user 
      ON verification_requests(platform, platform_user_id, status);

    CREATE TABLE IF NOT EXISTS download_tokens (
      token TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      verification_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dt_session 
      ON download_tokens(session_id, file_id);
  `);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

module.exports = {
  initDb,
  getDb
};
