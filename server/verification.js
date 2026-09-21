const crypto = require('node:crypto');
const config = require('./config');
const { getDb } = require('./db');
const { getFileInfo, createDownloadToken } = require('./files-service');
const telegramService = require('./telegram-service');
const discordService = require('./discord-service');

function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

class VerificationService {
  startVerification(sessionId, fileId, platform) {
    const fileInfo = getFileInfo(fileId);
    if (!fileInfo) {
      throw new Error(`Tệp tải không tồn tại (File ID: ${fileId})`);
    }

    if (platform !== 'telegram' && platform !== 'discord') {
      throw new Error(`Nền tảng xác minh không hợp lệ (${platform})`);
    }

    if (platform === 'telegram' && !config.telegram.isConfigured) {
      throw new Error('Nền tảng Telegram chưa được cấu hình bot trên máy chủ');
    }

    if (platform === 'discord' && !config.discord.isConfigured) {
      throw new Error('Nền tảng Discord chưa được cấu hình OAuth2 trên máy chủ');
    }

    const db = getDb();
    const now = Date.now();
    const expiresAt = now + (config.linkTokenExpireSeconds * 1000);

    // Hủy các phiên xác minh đang chờ trước đó của cùng session cho file này
    const oldRequests = db.prepare(`
      SELECT * FROM verification_requests 
      WHERE session_id = ? AND file_id = ? AND status IN ('created', 'pending_link', 'pending_join')
    `).all(sessionId, fileId);

    for (const oldReq of oldRequests) {
      db.prepare(`UPDATE verification_requests SET status = 'cancelled' WHERE id = ?`).run(oldReq.id);
      if (oldReq.invite_link && oldReq.platform === 'telegram') {
        telegramService.revokeInviteLink(oldReq.invite_link).catch(() => {});
      }
    }

    const requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const linkToken = generateToken();
    const targetId = platform === 'telegram' ? config.telegram.chatId : config.discord.guildId;

    db.prepare(`
      INSERT INTO verification_requests (
        id, session_id, file_id, platform, target_id,
        link_token, link_token_expires_at, platform_user_id,
        platform_username, platform_display_name, invite_link,
        status, created_at, expires_at, last_checked_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'pending_link', ?, ?, ?, NULL)
    `).run(requestId, sessionId, fileId, platform, targetId, linkToken, expiresAt, now, expiresAt, now);

    let connectUrl = '';
    if (platform === 'telegram') {
      connectUrl = `https://t.me/${config.telegram.botUsername}?start=${linkToken}`;
    } else if (platform === 'discord') {
      connectUrl = discordService.getAuthUrl(linkToken);
    }

    return {
      requestId,
      fileId,
      fileName: fileInfo.displayName,
      platform,
      status: 'pending_link',
      connectUrl,
      expiresAt,
      expiresInSeconds: config.linkTokenExpireSeconds
    };
  }

  getVerificationStatus(sessionId, requestId) {
    const db = getDb();
    const now = Date.now();

    const request = db.prepare(`
      SELECT * FROM verification_requests WHERE id = ?
    `).get(requestId);

    if (!request) {
      return { found: false, error: 'Không tìm thấy phiên xác minh.' };
    }

    // Kiểm tra quyền sở hữu (Authorization)
    if (request.session_id !== sessionId) {
      return { found: false, error: 'Không có quyền truy cập phiên xác minh này.' };
    }

    // Kiểm tra hết hạn
    if (request.status !== 'verified' && request.status !== 'cancelled' && request.expires_at < now) {
      db.prepare(`UPDATE verification_requests SET status = 'expired' WHERE id = ?`).run(requestId);
      request.status = 'expired';
    }

    let downloadInfo = null;

    // Nếu đã verified, lấy hoặc sinh download token
    if (request.status === 'verified') {
      // Tìm xem có token nào còn hạn không
      let dtRow = db.prepare(`
        SELECT * FROM download_tokens 
        WHERE verification_id = ? AND session_id = ? AND used_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(requestId, sessionId, now);

      if (!dtRow) {
        dtRow = createDownloadToken(db, sessionId, request.file_id, request.id);
        downloadInfo = {
          token: dtRow.token,
          downloadUrl: dtRow.downloadUrl,
          expiresAt: dtRow.expiresAt,
          expiresInSeconds: config.downloadTokenExpireSeconds
        };
      } else {
        downloadInfo = {
          token: dtRow.token,
          downloadUrl: `/api/download?token=${dtRow.token}`,
          expiresAt: dtRow.expires_at,
          expiresInSeconds: Math.max(0, Math.floor((dtRow.expires_at - now) / 1000))
        };
      }
    }

    const fileInfo = getFileInfo(request.file_id) || {};

    let connectUrl = '';
    if (request.platform === 'telegram') {
      connectUrl = `https://t.me/${config.telegram.botUsername}?start=${request.link_token}`;
    } else if (request.platform === 'discord') {
      connectUrl = discordService.getAuthUrl(request.link_token);
    }

    return {
      found: true,
      requestId: request.id,
      fileId: request.file_id,
      fileName: fileInfo.displayName || request.file_id,
      platform: request.platform,
      status: request.status,
      connectUrl,
      inviteLink: request.invite_link || (request.platform === 'telegram' ? config.telegram.groupLink : config.discord.serverLink),
      platformUser: request.platform_user_id ? {
        id: request.platform_user_id,
        username: request.platform_username || '',
        displayName: request.platform_display_name || ''
      } : null,
      expiresAt: request.expires_at,
      expiresInSeconds: Math.max(0, Math.floor((request.expires_at - now) / 1000)),
      lastError: request.last_error,
      downloadInfo
    };
  }

  async recheckMembership(sessionId, requestId) {
    const db = getDb();
    const now = Date.now();

    const request = db.prepare(`
      SELECT * FROM verification_requests WHERE id = ?
    `).get(requestId);

    if (!request || request.session_id !== sessionId) {
      throw new Error('Phiên xác minh không tồn tại hoặc không có quyền truy cập.');
    }

    if (request.status === 'verified') {
      return this.getVerificationStatus(sessionId, requestId);
    }

    if (request.status === 'cancelled' || request.status === 'expired') {
      throw new Error(`Phiên đã ở trạng thái ${request.status}. Vui lòng thử lại phiên mới.`);
    }

    // Nếu chưa liên kết tài khoản thì chưa thể kiểm tra thành viên
    if (!request.platform_user_id) {
      return {
        ...this.getVerificationStatus(sessionId, requestId),
        message: 'Chưa liên kết tài khoản. Vui lòng bấm vào link liên kết trước.'
      };
    }

    if (request.platform === 'telegram') {
      const res = await telegramService.checkUserMembership(request.target_id, request.platform_user_id);
      
      if (res.isMember) {
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'verified', last_checked_at = ?, last_error = NULL 
          WHERE id = ?
        `).run(now, requestId);
      } else {
        // Cập nhật lại invite link nếu chưa có
        if (!request.invite_link) {
          const inviteLink = await telegramService.createInviteLinkForRequest(requestId, request.expires_at);
          db.prepare(`UPDATE verification_requests SET invite_link = ? WHERE id = ?`).run(inviteLink, requestId);
        }
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'pending_join', last_checked_at = ? 
          WHERE id = ?
        `).run(now, requestId);
      }
    } else if (request.platform === 'discord') {
      const res = await discordService.checkGuildMembership(request.target_id, request.platform_user_id);

      if (res.isMember) {
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'verified', last_checked_at = ?, last_error = NULL 
          WHERE id = ?
        `).run(now, requestId);
      } else {
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'pending_join', last_checked_at = ?, last_error = ? 
          WHERE id = ?
        `).run(now, res.error || 'Chưa tham gia server Discord', requestId);
      }
    }

    return this.getVerificationStatus(sessionId, requestId);
  }

  cancelVerification(sessionId, requestId) {
    const db = getDb();
    const request = db.prepare(`
      SELECT * FROM verification_requests WHERE id = ?
    `).get(requestId);

    if (!request || request.session_id !== sessionId) {
      throw new Error('Phiên không tồn tại hoặc không có quyền thao tác.');
    }

    db.prepare(`
      UPDATE verification_requests SET status = 'cancelled' WHERE id = ?
    `).run(requestId);

    if (request.invite_link && request.platform === 'telegram') {
      telegramService.revokeInviteLink(request.invite_link).catch(() => {});
    }

    return { success: true };
  }

  async handleDiscordCallback(code, state, sessionId) {
    const db = getDb();
    const now = Date.now();

    const request = db.prepare(`
      SELECT * FROM verification_requests 
      WHERE link_token = ? AND platform = 'discord'
    `).get(state);

    if (!request) {
      throw new Error('Mã trạng thái OAuth state không hợp lệ.');
    }

    if (request.session_id !== sessionId) {
      throw new Error('Phiên xác thực không khớp với phiên web hiện tại.');
    }

    if (request.status === 'cancelled' || request.expires_at < now) {
      throw new Error('Phiên xác minh này đã hết hạn hoặc bị hủy.');
    }

    // Đổi code lấy token và user info
    const tokenData = await discordService.exchangeCodeForToken(code);
    const userInfo = await discordService.getUserInfo(tokenData.access_token);

    const userId = String(userInfo.id);
    const username = userInfo.username ? `@${userInfo.username}` : `User ${userId}`;
    const displayName = userInfo.global_name || userInfo.username || `User ${userId}`;

    // Kiểm tra membership
    const membership = await discordService.checkGuildMembership(request.target_id, userId);

    const newStatus = membership.isMember ? 'verified' : 'pending_join';
    const lastError = membership.error || null;

    db.prepare(`
      UPDATE verification_requests 
      SET platform_user_id = ?,
          platform_username = ?,
          platform_display_name = ?,
          status = ?,
          last_checked_at = ?,
          last_error = ?
      WHERE id = ?
    `).run(userId, username, displayName, newStatus, now, lastError, request.id);

    return {
      requestId: request.id,
      fileId: request.file_id,
      isMember: membership.isMember,
      isPendingScreening: membership.isPendingScreening
    };
  }

  async preDownloadCheck(sessionId, fileId, verificationId) {
    const db = getDb();
    const request = db.prepare(`
      SELECT * FROM verification_requests WHERE id = ?
    `).get(verificationId);

    if (!request || request.session_id !== sessionId) {
      return { ok: false, error: 'Phiên xác minh không hợp lệ.' };
    }

    if (request.file_id !== fileId) {
      return { ok: false, error: 'Tệp yêu cầu tải không khớp với phiên xác minh.' };
    }

    if (request.status !== 'verified') {
      return { ok: false, error: 'Phiên này chưa được xác minh thành viên hợp lệ.' };
    }

    // Re-check thành viên trực tiếp trước khi cho phép tải
    if (request.platform === 'telegram' && request.platform_user_id && config.telegram.isConfigured) {
      try {
        const res = await telegramService.checkUserMembership(request.target_id, request.platform_user_id);
        if (!res.isMember) {
          db.prepare(`UPDATE verification_requests SET status = 'pending_join' WHERE id = ?`).run(verificationId);
          return { ok: false, error: 'Bạn đã rời nhóm Telegram. Vui lòng tham gia lại nhóm để tiếp tục tải.' };
        }
      } catch (e) {
        // Nếu lỗi mạng tạm thời thì không chặn nếu đã verified gần đây (< 60s)
        const age = Date.now() - (request.last_checked_at || 0);
        if (age > 60000) {
          return { ok: false, error: 'Không thể kết nối Telegram API để kiểm tra lại thành viên. Vui lòng thử lại.' };
        }
      }
    } else if (request.platform === 'discord' && request.platform_user_id && config.discord.isConfigured) {
      try {
        const res = await discordService.checkGuildMembership(request.target_id, request.platform_user_id);
        if (!res.isMember) {
          db.prepare(`UPDATE verification_requests SET status = 'pending_join' WHERE id = ?`).run(verificationId);
          return { ok: false, error: 'Bạn chưa ở trong server Discord hoặc chưa đồng ý nội quy. Vui lòng tham gia lại.' };
        }
      } catch (e) {
        const age = Date.now() - (request.last_checked_at || 0);
        if (age > 60000) {
          return { ok: false, error: 'Không thể kết nối Discord API để kiểm tra lại thành viên. Vui lòng thử lại.' };
        }
      }
    }

    return { ok: true };
  }
}

const verificationService = new VerificationService();
module.exports = verificationService;
