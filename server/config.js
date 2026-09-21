const fs = require('node:fs');
const path = require('node:path');

// Tự đọc và parse file .env mà không cần thư viện bên ngoài
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();

    // Loại bỏ dấu nháy kép hoặc đơn nếu có
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // Không ghi đè nếu biến môi trường đã có sẵn trong process.env
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  sessionSecret: process.env.SESSION_SECRET || 'tx_default_secret_please_set_in_env_file_for_security',

  telegram: {
    token: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    botUsername: (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, ''),
    chatId: (process.env.TELEGRAM_CHAT_ID || '').trim(),
    groupLink: process.env.TELEGRAM_GROUP_LINK || 'https://t.me/BoxToolGS_VN',
    get isConfigured() {
      return Boolean(this.token && this.botUsername && this.chatId);
    }
  },

  discord: {
    clientId: (process.env.DISCORD_CLIENT_ID || '').trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || '').trim(),
    botToken: (process.env.DISCORD_BOT_TOKEN || '').trim(),
    guildId: (process.env.DISCORD_GUILD_ID || '').trim(),
    serverLink: process.env.DISCORD_SERVER_LINK || 'https://discord.gg/xa83TbAw6n',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
    get isConfigured() {
      return Boolean(this.clientId && this.clientSecret && this.botToken && this.guildId);
    }
  },

  linkTokenExpireSeconds: parseInt(process.env.LINK_TOKEN_EXPIRE_SECONDS || '600', 10),
  downloadTokenExpireSeconds: parseInt(process.env.DOWNLOAD_TOKEN_EXPIRE_SECONDS || '300', 10),

  validate() {
    console.log('----------------------------------------------------');
    console.log('✦ TUNDENXIN GATEKEEPER SYSTEM STATUS ✦');
    console.log(`• Server URL: ${this.baseUrl} (Port: ${this.port})`);
    
    if (this.telegram.isConfigured) {
      console.log(`• Telegram Bot: @${this.telegram.botUsername} [SẴN SÀNG ✓]`);
      console.log(`  Target Group ID: ${this.telegram.chatId}`);
    } else {
      console.log(`• Telegram Bot: [CHƯA CẤU HÌNH ✕]`);
      console.log(`  (Điền TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_CHAT_ID vào file .env)`);
    }

    if (this.discord.isConfigured) {
      console.log(`• Discord OAuth2 & Bot: Guild ID ${this.discord.guildId} [SẴN SÀNG ✓]`);
    } else {
      console.log(`• Discord OAuth2 & Bot: [CHƯA CẤU HÌNH ✕]`);
      console.log(`  (Tùy chọn: Điền thông tin Discord vào .env khi muốn kích hoạt thêm Discord)`);
    }
    console.log('----------------------------------------------------');
  }
};

module.exports = config;
