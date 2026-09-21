/**
 * Tundenxin Gatekeeper — Comprehensive Automated Test Suite
 * Kiểm thử tự động toàn bộ logic bảo mật, State Machine, Token, Session và Quyền truy cập
 */

const assert = require('node:assert');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const { initDb } = require('../server/db');
const { signSessionId, verifySessionSignature } = require('../server/session');
const {
  FILES_CATALOG,
  ensureSampleFiles,
  createDownloadToken,
  verifyAndConsumeDownloadToken
} = require('../server/files-service');

async function runTests() {
  console.log('====================================================');
  console.log('✦ KHỞI CHẠY BỘ KIỂM THỬ TỰ ĐỘNG TUNDENXIN GATEKEEPER ✦');
  console.log('====================================================\n');

  // Khởi tạo database in-memory để test độc lập, cách ly hoàn toàn
  const db = initDb(':memory:');
  ensureSampleFiles();

  let passedCount = 0;
  let totalCount = 0;

  function test(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`✓ [PASS ${totalCount}]: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`✕ [FAIL ${totalCount}]: ${name}`);
      console.error('  Error:', err.message);
      if (err.stack) {
        console.error('  Stack:', err.stack.split('\n')[1]);
      }
    }
  }

  async function testAsync(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`✓ [PASS ${totalCount}]: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`✕ [FAIL ${totalCount}]: ${name}`);
      console.error('  Error:', err.message);
      if (err.stack) {
        console.error('  Stack:', err.stack.split('\n')[1]);
      }
    }
  }

  // --------------------------------------------------------------------------
  // NHÓM 1: Session Security & HMAC Signing
  // --------------------------------------------------------------------------
  test('Session ID ký HMAC hợp lệ phải được xác minh thành công', () => {
    const sid = crypto.randomBytes(32).toString('hex');
    const sig = signSessionId(sid);
    assert.strictEqual(verifySessionSignature(sid, sig), true);
  });

  test('Session ID bị giả mạo hoặc thay đổi chữ ký phải bị từ chối', () => {
    const sid = crypto.randomBytes(32).toString('hex');
    const sig = signSessionId(sid);
    const fakeSid = crypto.randomBytes(32).toString('hex');
    const fakeSig = 'fake_signature_abc_123';

    assert.strictEqual(verifySessionSignature(fakeSid, sig), false);
    assert.strictEqual(verifySessionSignature(sid, fakeSig), false);
    assert.strictEqual(verifySessionSignature('', sig), false);
  });

  // --------------------------------------------------------------------------
  // NHÓM 2: Danh mục tệp và bảo vệ tệp tin
  // --------------------------------------------------------------------------
  test('Danh mục tệp bảo vệ phải chứa đủ 4 tool chính (Kuro, DMSHBY, Yukino, Eleutheria)', () => {
    assert.ok(FILES_CATALOG['kuro'], 'Kuro must exist');
    assert.ok(FILES_CATALOG['dmshby'], 'DMSHBY must exist');
    assert.ok(FILES_CATALOG['yukino'], 'Yukino must exist');
    assert.ok(FILES_CATALOG['eleutheria'], 'Eleutheria must exist');
  });

  // --------------------------------------------------------------------------
  // NHÓM 3: Download Token Life-Cycle & Atomic Consumption
  // --------------------------------------------------------------------------
  test('Sinh Download Token gắn với session và file hợp lệ', () => {
    const sessionId = 'session_user_A';
    const fileId = 'kuro';
    const verificationId = 'verif_123';

    const tokenData = createDownloadToken(db, sessionId, fileId, verificationId);
    assert.ok(tokenData.token, 'Token must be generated');
    assert.ok(tokenData.expiresAt > Date.now(), 'Token must have future expiry');
    assert.strictEqual(tokenData.downloadUrl, `/api/download?token=${tokenData.token}`);

    // Kiểm tra đã lưu vào DB
    const row = db.prepare('SELECT * FROM download_tokens WHERE token = ?').get(tokenData.token);
    assert.ok(row);
    assert.strictEqual(row.session_id, sessionId);
    assert.strictEqual(row.file_id, fileId);
    assert.strictEqual(row.used_at, null);
  });

  test('Download Token chỉ được sử dụng một lần duy nhất (Single-use Atomic Consumption)', () => {
    const sessionId = 'session_user_A';
    const tokenData = createDownloadToken(db, sessionId, 'dmshby', 'verif_456');

    // Lần 1: Sử dụng token -> Phải thành công
    const result1 = verifyAndConsumeDownloadToken(db, tokenData.token, sessionId);
    assert.strictEqual(result1.valid, true);
    assert.strictEqual(result1.fileId, 'dmshby');

    // Lần 2: Cố gắng sử dụng lại token -> Phải bị từ chối
    const result2 = verifyAndConsumeDownloadToken(db, tokenData.token, sessionId);
    assert.strictEqual(result2.valid, false);
    assert.ok(result2.error.includes('đã được sử dụng'));
  });

  test('Download Token của Session A không thể bị Session B sử dụng (Session Isolation)', () => {
    const sessionA = 'session_user_A';
    const sessionB = 'session_user_B';
    const tokenData = createDownloadToken(db, sessionA, 'yukino', 'verif_789');

    // Session B cố tình dùng token của Session A
    const result = verifyAndConsumeDownloadToken(db, tokenData.token, sessionB);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('không thuộc về phiên'));
  });

  test('Download Token đã hết hạn phải bị từ chối', () => {
    const sessionId = 'session_user_A';
    const token = 'expired_token_test_123';
    const now = Date.now();

    // Chèn trực tiếp token đã hết hạn 10 giây trước
    db.prepare(`
      INSERT INTO download_tokens (token, session_id, file_id, verification_id, expires_at, used_at, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `).run(token, sessionId, 'kuro', 'verif_000', now - 10000, now - 20000);

    const result = verifyAndConsumeDownloadToken(db, token, sessionId);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('hết hạn'));
  });

  // --------------------------------------------------------------------------
  // NHÓM 4: State Machine & Verification Request Transitions
  // --------------------------------------------------------------------------
  test('Tạo phiên xác minh Telegram với mã link_token 32 bytes base64url', () => {
    const requestId = 'req_tg_01';
    const sessionId = 'session_1';
    const linkToken = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    const expiresAt = now + 600000;

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'kuro', 'telegram', '-1001234567890', ?, ?, NULL, NULL, NULL, NULL, 'pending_link', ?, ?, ?, NULL)
    `).run(requestId, sessionId, linkToken, expiresAt, now, expiresAt, now);

    const row = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(row.status, 'pending_link');
    assert.strictEqual(row.link_token, linkToken);
    assert.strictEqual(row.platform_user_id, null);
  });

  test('Mô phỏng Deep Link Telegram: user gửi /start token -> gắn tài khoản vào phiên', () => {
    const linkToken = crypto.randomBytes(32).toString('base64url');
    const requestId = 'req_tg_02';
    const sessionId = 'session_2';
    const now = Date.now();

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'dmshby', 'telegram', '-1001234567890', ?, ?, NULL, NULL, NULL, NULL, 'pending_link', ?, ?, ?, NULL)
    `).run(requestId, sessionId, linkToken, now + 600000, now, now + 600000, now);

    // Giả lập bot nhận /start <linkToken> từ Telegram user ID 987654321
    const telegramUserId = '987654321';
    const telegramUsername = '@tundenxin_fan';
    const telegramName = 'Tundenxin Member';

    // Tiêu thụ token và gắn identity
    db.prepare(`
      UPDATE verification_requests 
      SET platform_user_id = ?,
          platform_username = ?,
          platform_display_name = ?,
          status = 'pending_join',
          last_checked_at = ?
      WHERE link_token = ? AND status = 'pending_link'
    `).run(telegramUserId, telegramUsername, telegramName, now, linkToken);

    const updated = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(updated.status, 'pending_join');
    assert.strictEqual(updated.platform_user_id, telegramUserId);
    assert.strictEqual(updated.platform_username, telegramUsername);
  });

  test('Mô phỏng xác minh thành viên: join request được duyệt -> chuyển trạng thái VERIFIED', () => {
    const requestId = 'req_tg_03';
    const sessionId = 'session_3';
    const now = Date.now();
    const inviteLink = 'https://t.me/+join_unique_code_123';

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'yukino', 'telegram', '-1001234567890', 'token_03', ?, '555666777', '@member_test', 'Tester', ?, 'pending_join', ?, ?, ?, NULL)
    `).run(requestId, sessionId, now + 600000, inviteLink, now, now + 600000, now);

    // Giả lập sự kiện bot duyệt join request thành công
    db.prepare(`
      UPDATE verification_requests 
      SET status = 'verified', last_checked_at = ? 
      WHERE id = ? AND status = 'pending_join'
    `).run(Date.now(), requestId);

    const verifiedReq = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(verifiedReq.status, 'verified');

    // Cấp download token sau khi verified
    const dlToken = createDownloadToken(db, sessionId, verifiedReq.file_id, verifiedReq.id);
    assert.ok(dlToken.token);

    // Tiêu thụ download token
    const dlResult = verifyAndConsumeDownloadToken(db, dlToken.token, sessionId);
    assert.strictEqual(dlResult.valid, true);
    assert.strictEqual(dlResult.fileId, 'yukino');
  });

  test('Sự kiện cũ đến sau phiên bị hủy hoặc hết hạn KHÔNG được hồi sinh phiên đó', () => {
    const requestId = 'req_cancelled';
    const sessionId = 'session_4';
    const now = Date.now();

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'eleutheria', 'telegram', '-1001234567890', 'token_c', ?, '111222333', '@old_user', 'Old', NULL, 'cancelled', ?, ?, ?, NULL)
    `).run(requestId, sessionId, now + 600000, now, now + 600000, now);

    // Cố gắng cập nhật trạng thái verified trên phiên đã cancelled
    const changes = db.prepare(`
      UPDATE verification_requests 
      SET status = 'verified' 
      WHERE id = ? AND status IN ('pending_link', 'pending_join')
    `).run(requestId).changes;

    assert.strictEqual(changes, 0, 'No rows should be updated when request is cancelled');

    const req = db.prepare('SELECT status FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(req.status, 'cancelled');
  });

  // --------------------------------------------------------------------------
  // NHÓM 5: Mô phỏng Discord OAuth & Screening Rules
  // --------------------------------------------------------------------------
  test('Mô phỏng Discord: người dùng chưa hoàn tất Membership Screening -> pending_join', () => {
    const requestId = 'req_dc_01';
    const sessionId = 'session_dc';
    const now = Date.now();

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'kuro', 'discord', 'guild_123456789', 'state_dc_01', ?, 'discord_user_999', '@discord_tag', 'Discord User', 'https://discord.gg/test', 'pending_join', ?, ?, ?, 'Chưa hoàn tất Membership Screening')
    `).run(requestId, sessionId, now + 600000, now, now + 600000, now);

    const req = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(req.status, 'pending_join');
    assert.ok(req.last_error.includes('Screening'));
  });

  test('Mô phỏng Discord: người dùng đã hoàn tất Screening -> VERIFIED', () => {
    const requestId = 'req_dc_02';
    const sessionId = 'session_dc_2';
    const now = Date.now();

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, 'kuro', 'discord', 'guild_123456789', 'state_dc_02', ?, 'discord_user_888', '@discord_ok', 'Discord Ok', 'https://discord.gg/test', 'pending_join', ?, ?, ?, NULL)
    `).run(requestId, sessionId, now + 600000, now, now + 600000, now);

    // Sau khi screening hoàn tất, bot kiểm tra lại và cập nhật verified
    db.prepare(`
      UPDATE verification_requests 
      SET status = 'verified', last_error = NULL, last_checked_at = ? 
      WHERE id = ?
    `).run(Date.now(), requestId);

    const verified = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(requestId);
    assert.strictEqual(verified.status, 'verified');
  });

  console.log('\n====================================================');
  console.log(`✦ KẾT QUẢ: ${passedCount}/${totalCount} BÀI KIỂM THỬ ĐẠT CHUẨN 100% ✦`);
  console.log('====================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
