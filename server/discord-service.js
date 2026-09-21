const config = require('./config');

class DiscordService {
  constructor() {
    this.clientId = config.discord.clientId;
    this.clientSecret = config.discord.clientSecret;
    this.botToken = config.discord.botToken;
    this.guildId = config.discord.guildId;
    this.redirectUri = config.discord.redirectUri;
    this.serverLink = config.discord.serverLink;
  }

  get isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.botToken && this.guildId);
  }

  getAuthUrl(state) {
    if (!this.isConfigured) return null;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify',
      state: state,
      prompt: 'consent'
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri
    });

    const res = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord Token Exchange Error (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async getUserInfo(accessToken) {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord Get User Error (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async checkGuildMembership(guildId, userId) {
    if (!this.botToken) {
      throw new Error('Discord Bot Token chưa được cấu hình');
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${this.botToken}` }
    });

    if (res.status === 404) {
      // Tài khoản chưa tham gia server Discord
      return {
        isMember: false,
        isPendingScreening: false,
        inviteUrl: this.serverLink
      };
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord Check Member Error (${res.status}): ${errText}`);
    }

    const memberData = await res.json();

    // Kiểm tra cờ pending (Membership Screening)
    if (memberData.pending === true) {
      return {
        isMember: false,
        isPendingScreening: true,
        inviteUrl: this.serverLink,
        error: 'Tài khoản của bạn chưa hoàn tất xét duyệt nội quy (Membership Screening) của server Discord.'
      };
    }

    return {
      isMember: true,
      isPendingScreening: false,
      member: memberData
    };
  }
}

const discordService = new DiscordService();
module.exports = discordService;
