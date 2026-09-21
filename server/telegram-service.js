const config = require('./config');
const { getDb } = require('./db');

class TelegramService {
  constructor() {
    this.token = config.telegram.token;
    this.chatId = config.telegram.chatId;
    this.botUsername = config.telegram.botUsername;
    this.isPolling = false;
    this.offset = 0;
    this.abortController = null;
  }

  get isConfigured() {
    return Boolean(this.token && this.chatId && this.botUsername);
  }

  async callApi(method, body = {}) {
    if (!this.token) {
      throw new Error('Telegram Bot Token chưa được cấu hình');
    }

    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.ok) {
      const errMsg = data.description || `Telegram API call error (${data.error_code || 'unknown'})`;
      const err = new Error(errMsg);
      err.errorCode = data.error_code;
      throw err;
    }
    return data.result;
  }

  async checkWebhookInfo() {
    try {
      const info = await this.callApi('getWebhookInfo');
      if (info.url) {
        console.warn(`[Telegram Warning] Bot đang có Webhook kích hoạt tại URL: ${info.url}`);
        console.warn('[Telegram Warning] Để chạy Long Polling local, hãy đảm bảo webhook không chặn hoặc cấu hình bot riêng.');
      }
      return info;
    } catch (err) {
      console.warn('[Telegram] Không thể kiểm tra Webhook info:', err.message);
      return null;
    }
  }

  async startPolling() {
    if (!this.isConfigured) {
      console.log('[Telegram] Bỏ qua Long Polling (Chưa đủ cấu hình trong .env).');
      return;
    }

    await this.checkWebhookInfo();

    this.isPolling = true;
    console.log(`[Telegram] Đang khởi động Long Polling cho bot @${this.botUsername}...`);

    this.pollLoop();
  }

  stopPolling() {
    this.isPolling = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    console.log('[Telegram] Đã dừng Long Polling.');
  }

  async pollLoop() {
    while (this.isPolling) {
      try {
        const updates = await this.callApi('getUpdates', {
          offset: this.offset,
          timeout: 20,
          allowed_updates: ['message', 'chat_member', 'chat_join_request']
        });

        if (Array.isArray(updates)) {
          for (const update of updates) {
            this.offset = Math.max(this.offset, update.update_id + 1);
            await this.processUpdate(update);
          }
        }
      } catch (err) {
        if (!this.isPolling) break;

        // Tránh log spam nếu lỗi mạng tạm thời
        console.warn('[Telegram Polling Lỗi]:', err.message);
        // Chờ 3s trước khi thử lại
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  async processUpdate(update) {
    try {
      // 1. Xử lý lệnh /start trong chat riêng (Deep Linking)
      if (update.message && update.message.text) {
        await this.handlePrivateMessage(update.message);
      }

      // 2. Xử lý yêu cầu tham gia nhóm (chat_join_request)
      if (update.chat_join_request) {
        await this.handleChatJoinRequest(update.chat_join_request);
      }

      // 3. Xử lý cập nhật thành viên nhóm (chat_member)
      if (update.chat_member) {
        await this.handleChatMemberUpdate(update.chat_member);
      }
    } catch (err) {
      console.error('[Telegram Update Error]:', err);
    }
  }

  async handlePrivateMessage(message) {
    // Chỉ xử lý tin nhắn riêng tư với bot
    if (message.chat.type !== 'private') return;

    const text = message.text.trim();
    if (!text.startsWith('/start')) return;

    const parts = text.split(/\s+/);
    const token = parts[1]; // /start <token>

    const fromUser = message.from;
    const userId = String(fromUser.id);
    const username = fromUser.username ? `@${fromUser.username}` : '';
    const displayName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ') || `User ${userId}`;

    if (!token) {
      await this.sendMessage(message.chat.id, 
        `✦ *Tundenxin Gatekeeper Bot* ✦\n\n` +
        `Chào bạn *${displayName}*! Bot này dùng để xác minh thành viên nhóm trước khi tải Tool Genshin Impact.\n\n` +
        `👉 Vui lòng bấm vào nút *TẢI NGAY* trên website để nhận liên kết xác thực tự động.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const db = getDb();
    const now = Date.now();

    // Tiêu thụ token nguyên tử
    db.exec('BEGIN TRANSACTION;');
    try {
      const request = db.prepare(`
        SELECT * FROM verification_requests 
        WHERE link_token = ? AND platform = 'telegram'
      `).get(token);

      if (!request) {
        db.exec('ROLLBACK;');
        await this.sendMessage(message.chat.id, 
          `❌ *Mã xác thực không hợp lệ!*\n\n` +
          `Mã liên kết này không tồn tại hoặc đã được tạo từ một phiên cũ. Vui lòng quay lại website và bấm thử lại.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      if (request.status === 'cancelled' || request.status === 'expired') {
        db.exec('ROLLBACK;');
        await this.sendMessage(message.chat.id, 
          `⏱ *Phiên xác thực đã hết hạn hoặc bị hủy!*\n\nVui lòng quay lại website để bắt đầu lượt mới.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      if (request.link_token_expires_at < now) {
        db.prepare(`UPDATE verification_requests SET status = 'expired' WHERE id = ?`).run(request.id);
        db.exec('COMMIT;');
        await this.sendMessage(message.chat.id, 
          `⏱ *Mã liên kết đã hết hạn!*\n\nVui lòng bấm 'Thử lại' trên website để nhận mã mới.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Gắn tài khoản Telegram vào phiên
      db.prepare(`
        UPDATE verification_requests 
        SET platform_user_id = ?,
            platform_username = ?,
            platform_display_name = ?,
            status = 'pending_join',
            last_checked_at = ?
        WHERE id = ?
      `).run(userId, username, displayName, now, request.id);

      db.exec('COMMIT;');

      console.log(`[Telegram] Đã liên kết tài khoản: ${displayName} (${userId}) với session ${request.session_id}`);

      // Kiểm tra ngay xem tài khoản này đã là thành viên trong nhóm chưa
      const membership = await this.checkUserMembership(this.chatId, userId);

      if (membership.isMember) {
        // Đã là thành viên rồi! Mở khóa ngay
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'verified', last_checked_at = ? 
          WHERE id = ?
        `).run(Date.now(), request.id);

        await this.sendMessage(message.chat.id,
          `✅ *Xác thực thành công!*\n\n` +
          `Hệ thống nhận thấy bạn đã là thành viên hợp lệ của nhóm. Quyền tải file trên website đã được *MỞ KHÓA* ngay bây giờ!\n\n` +
          `👉 Hãy quay lại trình duyệt để bấm nút *TẢI FILE NGAY*.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Chưa tham gia nhóm -> Tạo invite link có yêu cầu duyệt (join request)
        const inviteLink = await this.createInviteLinkForRequest(request.id, request.expires_at);

        await this.sendMessage(message.chat.id,
          `✦ *Đã liên kết tài khoản thành công!* ✦\n\n` +
          `Chào bạn *${displayName}*! Bạn chưa tham gia nhóm chính thức của chúng tôi.\n\n` +
          `👉 Bấm vào link dưới đây để gửi yêu cầu tham gia nhóm, hệ thống sẽ tự động duyệt và mở khóa tải file ngay lập tức:\n\n` +
          `${inviteLink}\n\n` +
          `_(Sau khi gửi yêu cầu, bot sẽ tự động xác nhận trên website)_`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (e) {}
      console.error('[Telegram handlePrivateMessage Error]:', err);
    }
  }

  async checkUserMembership(chatId, userId) {
    try {
      const member = await this.callApi('getChatMember', {
        chat_id: chatId,
        user_id: parseInt(userId, 10)
      });

      const status = member.status;
      // Trạng thái hợp lệ: creator, administrator, member, hoặc restricted nhưng có is_member = true
      const isMember = (
        status === 'creator' ||
        status === 'administrator' ||
        status === 'member' ||
        (status === 'restricted' && Boolean(member.is_member))
      );

      return { isMember, status, member };
    } catch (err) {
      console.warn(`[Telegram checkUserMembership Error] (${userId}):`, err.message);
      return { isMember: false, status: 'error', error: err.message };
    }
  }

  async createInviteLinkForRequest(requestId, expiresAt) {
    const db = getDb();
    try {
      const expireTimestamp = Math.floor(expiresAt / 1000);
      const res = await this.callApi('createChatInviteLink', {
        chat_id: this.chatId,
        name: `TxGate-${requestId.slice(0, 8)}`,
        expire_date: expireTimestamp,
        creates_join_request: true
      });

      const inviteLink = res.invite_link;
      db.prepare(`
        UPDATE verification_requests 
        SET invite_link = ? 
        WHERE id = ?
      `).run(inviteLink, requestId);

      return inviteLink;
    } catch (err) {
      console.error('[Telegram createChatInviteLink Error]:', err);
      // Fallback về link nhóm công khai nếu bot chưa có quyền createChatInviteLink
      return config.telegram.groupLink;
    }
  }

  async handleChatJoinRequest(joinRequest) {
    const chatId = String(joinRequest.chat.id);
    const userId = String(joinRequest.from.id);
    const inviteLink = joinRequest.invite_link ? joinRequest.invite_link.invite_link : '';

    console.log(`[Telegram] Nhận chat_join_request từ User ${userId} tại Chat ${chatId}`);

    // Chỉ xử lý nếu đúng nhóm cấu hình
    if (chatId !== String(this.chatId)) return;

    const db = getDb();
    const now = Date.now();

    // Tìm verification_request khớp với userId và phiên còn hiệu lực
    const request = db.prepare(`
      SELECT * FROM verification_requests 
      WHERE platform = 'telegram' 
        AND platform_user_id = ? 
        AND status IN ('pending_link', 'pending_join')
        AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, now);

    if (!request) {
      console.log(`[Telegram] Không tìm thấy phiên xác minh phù hợp cho join request của User ${userId}. Bỏ qua auto-approve.`);
      return;
    }

    // Nếu có inviteLink, kiểm tra xem có đúng link được cấp cho phiên này không (ngăn dùng link chia sẻ)
    if (request.invite_link && inviteLink && request.invite_link !== inviteLink) {
      console.warn(`[Telegram] User ${userId} dùng link mời khác với link được cấp. Bỏ qua auto-approve.`);
      return;
    }

    // Duyệt yêu cầu tham gia nhóm
    try {
      await this.callApi('approveChatJoinRequest', {
        chat_id: this.chatId,
        user_id: parseInt(userId, 10)
      });
      console.log(`[Telegram] Đã approveChatJoinRequest cho User ${userId}`);
    } catch (err) {
      console.warn(`[Telegram] Lỗi approveChatJoinRequest:`, err.message);
    }

    // Xác nhận lại trạng thái thành viên
    const membership = await this.checkUserMembership(this.chatId, userId);
    if (membership.isMember) {
      db.prepare(`
        UPDATE verification_requests 
        SET status = 'verified', last_checked_at = ? 
        WHERE id = ?
      `).run(now, request.id);

      console.log(`[Telegram] Đã cập nhật trạng thái VERIFIED cho session ${request.session_id}`);

      // Thông báo cho user
      try {
        await this.sendMessage(userId,
          `🎉 *Gia nhập nhóm thành công!*\n\n` +
          `Yêu cầu tham gia của bạn đã được duyệt. Quyền tải file trên website *Tundenxin* đã sẵn sàng!\n\n` +
          `👉 Hãy quay lại trình duyệt để bấm nút *TẢI FILE NGAY*.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  }

  async handleChatMemberUpdate(chatMemberUpdate) {
    const chatId = String(chatMemberUpdate.chat.id);
    if (chatId !== String(this.chatId)) return;

    // Lấy ID tại new_chat_member.user.id (không phải from.id)
    const newMember = chatMemberUpdate.new_chat_member;
    if (!newMember || !newMember.user) return;

    const userId = String(newMember.user.id);
    const status = newMember.status;
    const isMember = (
      status === 'creator' ||
      status === 'administrator' ||
      status === 'member' ||
      (status === 'restricted' && Boolean(newMember.is_member))
    );

    if (isMember) {
      const db = getDb();
      const now = Date.now();

      const request = db.prepare(`
        SELECT * FROM verification_requests 
        WHERE platform = 'telegram' 
          AND platform_user_id = ? 
          AND status IN ('pending_link', 'pending_join')
          AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(userId, now);

      if (request) {
        db.prepare(`
          UPDATE verification_requests 
          SET status = 'verified', last_checked_at = ? 
          WHERE id = ?
        `).run(now, request.id);

        console.log(`[Telegram chat_member] Đã cập nhật VERIFIED cho User ${userId}`);
      }
    }
  }

  async revokeInviteLink(inviteLink) {
    if (!inviteLink || !this.isConfigured) return;
    try {
      await this.callApi('revokeChatInviteLink', {
        chat_id: this.chatId,
        invite_link: inviteLink
      });
    } catch (err) {
      console.warn(`[Telegram revokeInviteLink Error]:`, err.message);
    }
  }

  async sendMessage(chatId, text, extra = {}) {
    try {
      return await this.callApi('sendMessage', {
        chat_id: chatId,
        text: text,
        ...extra
      });
    } catch (err) {
      console.warn(`[Telegram sendMessage Error] (${chatId}):`, err.message);
      return null;
    }
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
