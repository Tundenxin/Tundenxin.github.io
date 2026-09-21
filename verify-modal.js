/**
 * Tundenxin Gatekeeper — Client Verification Modal
 * Quản lý quy trình xác minh thành viên Telegram / Discord và mở khóa tải file.
 */

(function () {
  'use strict';

  let systemStatus = {
    platforms: {
      telegram: { configured: false, botUsername: '', groupLink: '' },
      discord: { configured: false, serverLink: '' }
    },
    files: []
  };

  let currentSession = {
    fileId: null,
    fileName: '',
    platform: null,
    requestId: null,
    status: null,
    connectUrl: null,
    inviteLink: null,
    platformUser: null,
    downloadInfo: null,
    expiresAt: null,
    pollingInterval: null,
    countdownInterval: null
  };

  const modalHtml = `
    <div id="txGateOverlay" class="tx-gate-overlay" aria-hidden="true">
      <div class="tx-gate-modal" role="dialog" aria-modal="true" aria-labelledby="txGateTitle">
        <button type="button" class="tx-gate-close" id="txGateCloseBtn" aria-label="Đóng" title="Đóng">✕</button>

        <!-- Header -->
        <div class="tx-gate-header">
          <div class="tx-gate-badge">
            <span class="tx-gate-pulse"></span>
            <span>✦ BẢO VỆ TẬP TIN • XÁC MINH THÀNH VIÊN ✦</span>
          </div>
          <h2 id="txGateTitle" class="tx-gate-title">Tải <span id="txGateFileName" class="highlight">Tệp Tin</span></h2>
          <p class="tx-gate-desc">Vui lòng hoàn tất xác minh thành viên nhóm Telegram hoặc server Discord để mở khóa quyền tải file an toàn.</p>
        </div>

        <!-- Các bước tiến trình -->
        <div class="tx-gate-steps" id="txGateSteps">
          <div class="tx-step-item active" id="stepIndicator1">
            <span class="tx-step-num">1</span>
            <span class="tx-step-text">Nền tảng</span>
          </div>
          <div class="tx-step-item" id="stepIndicator2">
            <span class="tx-step-num">2</span>
            <span class="tx-step-text">Liên kết</span>
          </div>
          <div class="tx-step-item" id="stepIndicator3">
            <span class="tx-step-num">3</span>
            <span class="tx-step-text">Tham gia</span>
          </div>
          <div class="tx-step-item" id="stepIndicator4">
            <span class="tx-step-num">4</span>
            <span class="tx-step-text">Tải file</span>
          </div>
        </div>

        <!-- Hộp thông báo lỗi (nếu có) -->
        <div class="tx-gate-error" id="txGateError" aria-live="polite"></div>

        <!-- Nội dung Step 1: Chọn nền tảng -->
        <div class="tx-gate-step-view" id="stepView1">
          <div class="tx-platform-grid">
            <div class="tx-platform-card telegram" id="chooseTelegramBtn">
              <div class="tx-platform-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z"/>
                </svg>
              </div>
              <div class="tx-platform-name">Telegram</div>
              <div class="tx-platform-sub">Liên kết qua bot và tham gia nhóm Telegram</div>
              <span class="tx-platform-badge" id="tgBadge">Đang kiểm tra...</span>
            </div>

            <div class="tx-platform-card discord" id="chooseDiscordBtn">
              <div class="tx-platform-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div class="tx-platform-name">Discord</div>
              <div class="tx-platform-sub">Đăng nhập OAuth2 và tham gia server Discord</div>
              <span class="tx-platform-badge" id="dcBadge">Đang kiểm tra...</span>
            </div>
          </div>
        </div>

        <!-- Nội dung Step 2: Liên kết tài khoản -->
        <div class="tx-gate-step-view" id="stepView2" style="display:none;">
          <div class="tx-gate-body-box">
            <h3 id="step2Heading">Liên kết tài khoản</h3>
            <p id="step2Instructions" style="color:#cbd5e1;font-size:13px;line-height:1.5;">
              Bấm nút dưới đây để kết nối tài khoản của bạn. Sau khi bấm, trang sẽ tự động chuyển bước.
            </p>
            <a href="#" target="_blank" rel="noopener" class="tx-action-cta-btn" id="step2CtaBtn">
              <span>Mở ứng dụng để liên kết ↗</span>
            </a>
          </div>
        </div>

        <!-- Nội dung Step 3: Tham gia nhóm / duyệt membership -->
        <div class="tx-gate-step-view" id="stepView3" style="display:none;">
          <div class="tx-user-info-card">
            <div class="tx-user-meta">
              <strong id="linkedUserDisplay">@username</strong>
              <small>Tài khoản đã liên kết</small>
            </div>
            <button type="button" class="tx-btn-relink" id="btnRelink">Đổi tài khoản</button>
          </div>

          <div class="tx-gate-body-box">
            <h3 id="step3Heading">Tham gia Nhóm/Server</h3>
            <p id="step3Instructions" style="color:#cbd5e1;font-size:13px;line-height:1.5;">
              Tài khoản của bạn chưa tham gia nhóm. Hãy bấm nút dưới đây để gửi yêu cầu tham gia (hoặc đồng ý nội quy nếu là Discord):
            </p>
            <a href="#" target="_blank" rel="noopener" class="tx-action-cta-btn" id="step3JoinBtn">
              <span>Tham gia ngay ↗</span>
            </a>
          </div>
        </div>

        <!-- Nội dung Step 4: Đã xác minh & Tải file -->
        <div class="tx-gate-step-view" id="stepView4" style="display:none;">
          <div class="tx-verified-card">
            <div class="tx-verified-icon">✓</div>
            <h3>Xác minh thành công!</h3>
            <p style="color:#cbd5e1;font-size:13px;margin:0 0 10px;">
              Tài khoản <strong id="verifiedUserText" style="color:#38bdf8;"></strong> đã được xác nhận là thành viên hợp lệ.
            </p>
            <a href="#" class="tx-download-btn-active" id="btnDownloadNow">
              <span>⇩ TẢI TỆP NGAY BÂY GIỜ</span>
            </a>
            <small style="display:block;color:#94a3b8;font-size:11px;margin-top:10px;">
              (Liên kết tải có hiệu lực trong <span id="downloadExpireCountdown">5:00</span> phút)
            </small>
          </div>
        </div>

        <!-- Footer hành động & trạng thái polling -->
        <div class="tx-gate-footer">
          <div class="tx-gate-polling-status" id="pollingStatus">
            <span class="tx-pulse-mini"></span>
            <span id="pollingStatusText">Sẵn sàng</span>
          </div>
          <div class="tx-footer-btns">
            <button type="button" class="tx-sub-btn" id="btnChangePlatform" style="display:none;">Đổi nền tảng</button>
            <button type="button" class="tx-sub-btn" id="btnManualRecheck" style="display:none;">🔄 Kiểm tra lại</button>
          </div>
        </div>
      </div>
    </div>
  `;

  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        systemStatus = await res.json();
        updatePlatformBadges();
      }
    } catch (e) {
      console.warn('[Gatekeeper] Không thể kết nối backend /api/status');
    }
  }

  function updatePlatformBadges() {
    const tgBadge = document.getElementById('tgBadge');
    const dcBadge = document.getElementById('dcBadge');
    const tgCard = document.getElementById('chooseTelegramBtn');
    const dcCard = document.getElementById('chooseDiscordBtn');

    if (tgBadge && tgCard) {
      if (systemStatus.platforms.telegram.configured) {
        tgBadge.textContent = 'Sẵn sàng ✓';
        tgBadge.className = 'tx-platform-badge ready';
        tgCard.classList.remove('disabled');
      } else {
        tgBadge.textContent = 'Chưa cấu hình';
        tgBadge.className = 'tx-platform-badge unready';
        tgCard.classList.add('disabled');
      }
    }

    if (dcBadge && dcCard) {
      if (systemStatus.platforms.discord.configured) {
        dcBadge.textContent = 'Sẵn sàng ✓';
        dcBadge.className = 'tx-platform-badge ready';
        dcCard.classList.remove('disabled');
      } else {
        dcBadge.textContent = 'Chưa cấu hình';
        dcBadge.className = 'tx-platform-badge unready';
        dcCard.classList.add('disabled');
      }
    }
  }

  function renderModal() {
    if (document.getElementById('txGateOverlay')) return;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    while (div.firstChild) {
      document.body.appendChild(div.firstChild);
    }
    bindModalEvents();
  }

  function bindModalEvents() {
    const overlay = document.getElementById('txGateOverlay');
    const closeBtn = document.getElementById('txGateCloseBtn');
    const tgCard = document.getElementById('chooseTelegramBtn');
    const dcCard = document.getElementById('chooseDiscordBtn');
    const changePlatformBtn = document.getElementById('btnChangePlatform');
    const manualRecheckBtn = document.getElementById('btnManualRecheck');
    const relinkBtn = document.getElementById('btnRelink');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        closeModal();
      }
    });

    if (tgCard) {
      tgCard.addEventListener('click', () => {
        if (!systemStatus.platforms.telegram.configured) {
          showError('Nền tảng Telegram chưa được cấu hình Bot Token trong file .env trên máy chủ.');
          return;
        }
        startVerification('telegram');
      });
    }

    if (dcCard) {
      dcCard.addEventListener('click', () => {
        if (!systemStatus.platforms.discord.configured) {
          showError('Nền tảng Discord chưa được cấu hình OAuth2 trong file .env trên máy chủ.');
          return;
        }
        startVerification('discord');
      });
    }

    if (changePlatformBtn) {
      changePlatformBtn.addEventListener('click', () => {
        cancelCurrentRequest();
        showStep(1);
      });
    }

    if (manualRecheckBtn) {
      manualRecheckBtn.addEventListener('click', triggerManualRecheck);
    }

    if (relinkBtn) {
      relinkBtn.addEventListener('click', () => {
        cancelCurrentRequest();
        startVerification(currentSession.platform);
      });
    }

    // Lắng nghe postMessage từ cửa sổ OAuth2 Discord
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'DISCORD_AUTH_COMPLETE') {
        pollStatus();
      }
    });
  }

  function showError(msg) {
    const errBox = document.getElementById('txGateError');
    if (errBox) {
      errBox.textContent = msg || '';
      errBox.classList.toggle('active', Boolean(msg));
    }
  }

  function showStep(stepNumber) {
    showError('');
    for (let i = 1; i <= 4; i++) {
      const view = document.getElementById(`stepView${i}`);
      const indicator = document.getElementById(`stepIndicator${i}`);
      if (view) view.style.display = i === stepNumber ? 'block' : 'none';
      if (indicator) {
        indicator.classList.toggle('active', i === stepNumber);
        indicator.classList.toggle('completed', i < stepNumber);
      }
    }

    const changePlatformBtn = document.getElementById('btnChangePlatform');
    const manualRecheckBtn = document.getElementById('btnManualRecheck');

    if (changePlatformBtn) {
      changePlatformBtn.style.display = (stepNumber > 1 && stepNumber < 4) ? 'inline-block' : 'none';
    }
    if (manualRecheckBtn) {
      manualRecheckBtn.style.display = (stepNumber === 3) ? 'inline-block' : 'none';
    }
  }

  function openModal(fileId, fileName) {
    renderModal();
    fetchStatus();

    currentSession.fileId = fileId;
    currentSession.fileName = fileName;

    const titleEl = document.getElementById('txGateFileName');
    if (titleEl) titleEl.textContent = fileName;

    showStep(1);

    const overlay = document.getElementById('txGateOverlay');
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    stopPolling();
    stopCountdown();

    const overlay = document.getElementById('txGateOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  async function startVerification(platform) {
    showError('');
    updatePollingText('Đang tạo phiên xác minh...');

    try {
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: currentSession.fileId, platform: platform })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Không thể bắt đầu phiên xác minh.');
        return;
      }

      currentSession.requestId = data.requestId;
      currentSession.platform = platform;
      currentSession.connectUrl = data.connectUrl;
      currentSession.status = data.status;
      currentSession.expiresAt = data.expiresAt;

      setupStep2View();
      showStep(2);
      startPolling();

    } catch (err) {
      showError('Lỗi kết nối máy chủ: ' + err.message);
    }
  }

  function setupStep2View() {
    const heading = document.getElementById('step2Heading');
    const instructions = document.getElementById('step2Instructions');
    const ctaBtn = document.getElementById('step2CtaBtn');

    if (currentSession.platform === 'telegram') {
      if (heading) heading.textContent = '1. Liên kết tài khoản Telegram';
      if (instructions) {
        instructions.innerHTML = `
          Bấm nút bên dưới để mở ứng dụng Telegram và bấm <strong>Start</strong> trong cuộc trò chuyện riêng với bot.<br>
          <small style="color:#94a3b8;display:block;margin-top:6px;">(Sau khi bấm Start, trang web sẽ tự động nhận diện tài khoản của bạn)</small>
        `;
      }
      if (ctaBtn) {
        ctaBtn.className = 'tx-action-cta-btn telegram';
        ctaBtn.href = currentSession.connectUrl;
        ctaBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z"/></svg>
          <span>Mở Bot Telegram &amp; Bấm Start ↗</span>
        `;
      }
    } else {
      if (heading) heading.textContent = '1. Đăng nhập qua Discord';
      if (instructions) {
        instructions.innerHTML = `
          Bấm nút bên dưới để cấp quyền xác thực danh tính tài khoản Discord của bạn.<br>
          <small style="color:#94a3b8;display:block;margin-top:6px;">(Chúng tôi chỉ yêu cầu quyền định danh danh tính 'identify' an toàn)</small>
        `;
      }
      if (ctaBtn) {
        ctaBtn.className = 'tx-action-cta-btn discord';
        ctaBtn.href = currentSession.connectUrl;
        ctaBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          <span>Đăng nhập Discord xác thực ↗</span>
        `;
      }
    }
  }

  function setupStep3View(data) {
    const userDisplay = document.getElementById('linkedUserDisplay');
    const joinBtn = document.getElementById('step3JoinBtn');
    const heading = document.getElementById('step3Heading');
    const instructions = document.getElementById('step3Instructions');

    if (userDisplay) {
      const u = data.platformUser;
      userDisplay.textContent = u ? (u.username || u.displayName) : 'Đã kết nối';
    }

    if (currentSession.platform === 'telegram') {
      if (heading) heading.textContent = '2. Gửi yêu cầu tham gia Nhóm Telegram';
      if (instructions) {
        instructions.innerHTML = `
          Tài khoản của bạn chưa tham gia nhóm. Hãy bấm nút dưới đây để gửi yêu cầu vào nhóm Telegram, 
          hệ thống sẽ tự động phê duyệt và mở khóa tải file ngay lập tức.
        `;
      }
      if (joinBtn) {
        joinBtn.className = 'tx-action-cta-btn telegram';
        joinBtn.href = data.inviteLink || systemStatus.platforms.telegram.groupLink;
        joinBtn.textContent = 'Gửi yêu cầu tham gia Nhóm Telegram ↗';
      }
    } else {
      if (heading) heading.textContent = '2. Tham gia Server Discord';
      if (instructions) {
        instructions.innerHTML = `
          ${data.lastError || 'Bạn chưa có mặt trong server Discord hoặc chưa đồng ý nội quy (Screening Rules).'}<br>
          Bấm nút bên dưới để vào server, sau đó bấm nút <strong>Kiểm tra lại</strong>.
        `;
      }
      if (joinBtn) {
        joinBtn.className = 'tx-action-cta-btn discord';
        joinBtn.href = data.inviteLink || systemStatus.platforms.discord.serverLink;
        joinBtn.textContent = 'Vào Server Discord ↗';
      }
    }
  }

  function setupStep4View(data) {
    stopPolling();

    const userText = document.getElementById('verifiedUserText');
    const downloadBtn = document.getElementById('btnDownloadNow');

    if (userText) {
      const u = data.platformUser;
      userText.textContent = u ? (u.username || u.displayName) : 'Hợp lệ';
    }

    if (downloadBtn && data.downloadInfo) {
      downloadBtn.href = data.downloadInfo.downloadUrl;
      downloadBtn.onclick = null; // Cho phép trình duyệt mở liên kết tải trực tiếp
    }

    startCountdown(data.downloadInfo ? data.downloadInfo.expiresAt : Date.now() + 300000);
    showStep(4);
  }

  function startPolling() {
    stopPolling();
    updatePollingText('Đang tự động kiểm tra trạng thái...');

    currentSession.pollingInterval = setInterval(pollStatus, 2500);
  }

  function stopPolling() {
    if (currentSession.pollingInterval) {
      clearInterval(currentSession.pollingInterval);
      currentSession.pollingInterval = null;
    }
  }

  async function pollStatus() {
    if (!currentSession.requestId) return;

    try {
      const res = await fetch(`/api/verify/status?requestId=${currentSession.requestId}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success) return;

      currentSession.status = data.status;

      if (data.status === 'pending_join') {
        setupStep3View(data);
        showStep(3);
        updatePollingText('Đang chờ bạn tham gia nhóm...');
      } else if (data.status === 'verified') {
        setupStep4View(data);
        updatePollingText('✓ Đã xác minh thành công!');
      } else if (data.status === 'expired') {
        stopPolling();
        showError('Phiên xác minh đã hết hạn. Vui lòng bấm thử lại.');
        updatePollingText('Hết hạn');
      } else if (data.status === 'cancelled') {
        stopPolling();
        updatePollingText('Đã hủy');
      }
    } catch (e) {
      // Bỏ qua lỗi mạng chập chờn khi polling
    }
  }

  async function triggerManualRecheck() {
    if (!currentSession.requestId) return;
    updatePollingText('Đang kiểm tra lại...');
    showError('');

    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: currentSession.requestId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.status === 'verified') {
          setupStep4View(data);
        } else {
          showError(data.lastError || 'Hệ thống chưa thấy tài khoản của bạn trong nhóm. Vui lòng kiểm tra lại.');
          updatePollingText('Chưa đạt điều kiện');
        }
      } else {
        showError(data.error || 'Kiểm tra thất bại. Vui lòng thử lại sau.');
      }
    } catch (err) {
      showError('Lỗi kết nối khi kiểm tra lại.');
    }
  }

  async function cancelCurrentRequest() {
    stopPolling();
    stopCountdown();
    if (currentSession.requestId) {
      try {
        await fetch('/api/verify/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: currentSession.requestId })
        });
      } catch (e) {}
      currentSession.requestId = null;
    }
  }

  function startCountdown(expiresAt) {
    stopCountdown();
    const countdownEl = document.getElementById('downloadExpireCountdown');
    if (!countdownEl) return;

    function tick() {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      countdownEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

      if (diff <= 0) {
        stopCountdown();
        showError('Liên kết tải đã hết hạn hiệu lực. Vui lòng xác minh lại.');
        const btn = document.getElementById('btnDownloadNow');
        if (btn) {
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
        }
      }
    }

    tick();
    currentSession.countdownInterval = setInterval(tick, 1000);
  }

  function stopCountdown() {
    if (currentSession.countdownInterval) {
      clearInterval(currentSession.countdownInterval);
      currentSession.countdownInterval = null;
    }
  }

  function updatePollingText(text) {
    const el = document.getElementById('pollingStatusText');
    if (el) el.textContent = text;
  }

  function init() {
    fetchStatus();

    // Bắt sự kiện click cho các nút tải file có thuộc tính data-download-file
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-download-file]');
      if (btn) {
        e.preventDefault();
        const fileId = btn.getAttribute('data-download-file');
        const fileName = btn.getAttribute('data-file-name') || btn.textContent.trim();
        openModal(fileId, fileName);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TxGatekeeper = {
    open: openModal,
    close: closeModal
  };
})();
