/**
 * Tundenxin — Bảng thông báo Cảnh báo Rủi ro & Ban Wave
 * Tính năng:
 * - Tự động hiển thị khi vào web (trừ khi đang trong thời gian Tắt 60 phút)
 * - Tắt thông báo: Đóng hộp thoại ngay lập tức
 * - Tắt 60 phút: Lưu mốc thời gian vào localStorage, không hiện lại trong 60 phút
 * - Hỗ trợ mở lại bất kỳ lúc nào qua nút dưới chân trang (Footer)
 */

(function () {
  const SNOOZE_KEY = 'tx_banwave_notice_snooze_until';
  const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 60 phút = 3,600,000 ms

  const modalHtml = `
    <div id="txNoticeOverlay" class="tx-notice-overlay" aria-hidden="true">
      <div class="tx-notice-modal" role="dialog" aria-modal="true" aria-labelledby="txNoticeTitle">
        <button type="button" class="tx-notice-close" id="txNoticeCloseIcon" aria-label="Đóng thông báo" title="Đóng">✕</button>
        
        <div class="tx-notice-badge">
          <span class="tx-notice-pulse"></span>
          <span class="tx-notice-badge-text">✦ CẢNH BÁO QUAN TRỌNG ✦</span>
        </div>

        <h2 id="txNoticeTitle" class="tx-notice-title">Lưu ý khi sử dụng Tool</h2>

        <div class="tx-notice-warning-box">
          <div class="tx-notice-warn-icon">⚠</div>
          <div class="tx-notice-warn-text">
            <strong>Dùng tool luôn có rủi ro!</strong>
            <p>Lưu ý khi sử dụng vào những đợt <strong>Ban Wave</strong> của game để tránh rủi ro khóa tài khoản.</p>
          </div>
        </div>

        <p class="tx-notice-desc">
          Để biết rõ chi tiết, cập nhật tình hình an toàn mới nhất và được hỗ trợ, hãy tham gia nhóm của chúng tôi:
        </p>

        <div class="tx-notice-socials">
          <a href="https://discord.gg/Nfu5hqb3q" target="_blank" rel="noopener" class="tx-social-card discord">
            <div class="tx-social-icon discord-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <span class="tx-social-title">Tham gia Discord ↗</span>
          </a>

          <a href="https://t.me/BoxToolGS_VN" target="_blank" rel="noopener" class="tx-social-card telegram">
            <div class="tx-social-icon telegram-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z"/>
              </svg>
            </div>
            <span class="tx-social-title">Nhóm Telegram ↗</span>
          </a>
        </div>

        <div class="tx-notice-actions">
          <button type="button" class="tx-btn-snooze" id="txNoticeSnoozeBtn">
            <span class="tx-btn-icon">⏱</span>
            <span>Tắt 60 phút</span>
          </button>
          <button type="button" class="tx-btn-dismiss" id="txNoticeCloseBtn">
            <span class="tx-btn-icon">✕</span>
            <span>Tắt thông báo</span>
          </button>
        </div>
      </div>
    </div>

    <div id="txNoticeToast" class="tx-notice-toast" aria-live="polite"></div>
  `;

  function isSnoozed() {
    try {
      const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
      if (!snoozeUntil) return false;
      const remaining = Number(snoozeUntil) - Date.now();
      if (remaining > 0) {
        return true;
      } else {
        localStorage.removeItem(SNOOZE_KEY);
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  function showToast(message) {
    const toast = document.getElementById('txNoticeToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3500);
  }

  function openNotice() {
    const overlay = document.getElementById('txNoticeOverlay');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeNotice() {
    const overlay = document.getElementById('txNoticeOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function snooze60Minutes() {
    try {
      const snoozeUntil = Date.now() + SNOOZE_DURATION_MS;
      localStorage.setItem(SNOOZE_KEY, snoozeUntil.toString());
    } catch (e) {
      console.warn('Cannot write to localStorage', e);
    }
    closeNotice();
    showToast('⏱ Đã tắt thông báo trong 60 phút');
  }

  function isHomePage() {
    const path = window.location.pathname.toLowerCase().split(/[?#]/)[0];
    return path.endsWith('/index.html') || path.endsWith('/') || path === '' || (!path.endsWith('.html') && !path.includes('guide') && !path.includes('tools'));
  }

  function initNotice() {
    // Chỉ kích hoạt bảng thông báo cảnh báo ở Trang chủ
    if (!isHomePage()) return;

    // Inject modal nếu chưa có trong DOM
    if (!document.getElementById('txNoticeOverlay')) {
      const container = document.createElement('div');
      container.innerHTML = modalHtml;
      while (container.firstChild) {
        document.body.appendChild(container.firstChild);
      }
    }

    const overlay = document.getElementById('txNoticeOverlay');
    const closeBtn = document.getElementById('txNoticeCloseBtn');
    const snoozeBtn = document.getElementById('txNoticeSnoozeBtn');
    const closeIcon = document.getElementById('txNoticeCloseIcon');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeNotice);
    }

    if (closeIcon) {
      closeIcon.addEventListener('click', closeNotice);
    }

    if (snoozeBtn) {
      snoozeBtn.addEventListener('click', snooze60Minutes);
    }

    // Đóng khi click ngoài backdrop
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          closeNotice();
        }
      });
    }

    // Đóng khi nhấn phím Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        closeNotice();
      }
    });

    // Các nút kích hoạt mở lại thông báo (ví dụ nút ở Footer)
    document.querySelectorAll('.tx-open-notice, #openNoticeBtn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openNotice();
      });
    });

    // Kiểm tra xem có đang bị tắt 60 phút hay không
    if (!isSnoozed()) {
      // Hiển thị nhẹ nhàng sau khi trang tải xong
      setTimeout(openNotice, 350);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotice);
  } else {
    initNotice();
  }

  // Cung cấp API tiện ích nếu cần gọi thủ công
  window.TxNotice = {
    open: openNotice,
    close: closeNotice,
    snooze: snooze60Minutes,
    resetSnooze: function () {
      localStorage.removeItem(SNOOZE_KEY);
      showToast('✦ Đã khôi phục trạng thái thông báo');
    }
  };
})();
