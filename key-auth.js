/**
 * Tundenxin — Hệ thống Xác thực Key Tải Tool Genshin Impact
 * 
 * Danh sách Key:
 * - Kuro.apk:       tundenxin-kuro
 * - DMSHBY.sh:      tundenxin-dmshby
 * - Yukino.apk:     tundenxin-yukino
 * - Eleutheria.apk: tundenxin-eleutheria
 * 
 * Tính năng:
 * - Thông báo gia nhập nhóm nhận key 100% FREE
 * - Yêu cầu nhập key mỗi lần tải xuống
 * - Tự động mở link tải hoặc chuyển hướng nhóm khi nhập đúng key
 */

(function () {
  'use strict';

  const TOOL_DATA = {
    'kuro': {
      id: 'kuro',
      name: 'Kuro.apk',
      key: 'tundenxin-kuro',
      url: 'https://github.com/4firas/Kuro-GI/releases/download/v2.2.2h/KURO-v2.2.2h.apk',
      isGroupRedirect: false
    },
    'dmshby': {
      id: 'dmshby',
      name: 'DMSHBY.sh',
      key: 'tundenxin-dmshby',
      url: 'https://mega.nz/file/G6p2yAID#DyTnCl2SFMIBShvaEBE5tFV7MDCGMdxPkEbmOr6DW18',
      isGroupRedirect: false
    },
    'yukino': {
      id: 'yukino',
      name: 'Yukino.apk',
      key: 'tundenxin-yukino',
      url: 'https://mega.nz/file/jz4VHLRA#yOs0w6hPuQbKFQo8x1nuQwov805NanQEYDBPBfMskKs',
      isGroupRedirect: false
    },
    'eleutheria': {
      id: 'eleutheria',
      name: 'Eleutheria.apk',
      key: 'tundenxin-eleutheria',
      url: 'https://t.me/BoxToolGS_VN',
      isGroupRedirect: true,
      customSuccessMsg: '✦ Key chính xác! Đang mở nhóm Telegram để nhận bản cập nhật Eleutheria mới nhất...'
    }
  };

  let currentTool = null;

  const keyModalHtml = `
    <div id="txKeyOverlay" class="tx-key-overlay" aria-hidden="true">
      <div class="tx-key-modal" role="dialog" aria-modal="true" aria-labelledby="txKeyModalTitle">
        <button type="button" class="tx-key-close" id="txKeyCloseBtn" aria-label="Đóng bảng nhập key" title="Đóng">✕</button>

        <div class="tx-key-header">
          <div class="tx-key-badge">
            <span class="tx-key-badge-dot"></span>
            <span>✦ XÁC THỰC TẢI TOOL • FREE 100% ✦</span>
          </div>
          <h2 id="txKeyModalTitle" class="tx-key-title">Nhập Key tải <span id="txKeyToolName" class="highlight-tool">Tool</span></h2>
          <p class="tx-key-subtitle">Vui lòng nhập mã key hợp lệ để mở khóa liên kết tải về an toàn.</p>
        </div>

        <!-- Khối thông báo gia nhập nhóm nhận key 100% Free -->
        <div class="tx-key-notice-card" id="txKeyNoticeCard">
          <div class="tx-key-notice-header">
            <div class="tx-key-notice-gift">🎁</div>
            <div class="tx-key-notice-text">
              <strong>Gia nhập nhóm để nhận key tải 100% FREE</strong>
              <p>Key tải tool được chia sẻ hoàn toàn miễn phí, không rút gọn link kiếm tiền, nhận trực tiếp trong nhóm:</p>
            </div>
          </div>
          
          <div class="tx-key-notice-buttons">
            <a href="https://t.me/BoxToolGS_VN" target="_blank" rel="noopener" class="tx-key-link telegram" title="Tham gia kênh Telegram Tundenxin">
              <span class="link-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z"/>
                </svg>
              </span>
              <span>Lấy Key qua Telegram ↗</span>
            </a>

            <a href="https://discord.gg/xa83TbAw6n" target="_blank" rel="noopener" class="tx-key-link discord" title="Tham gia Discord Tundenxin">
              <span class="link-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </span>
              <span>Lấy Key qua Discord ↗</span>
            </a>
          </div>
        </div>

        <!-- Form nhập key -->
        <form class="tx-key-form" id="txKeyForm" novalidate>
          <div class="tx-key-form-group">
            <div class="tx-key-label-row">
              <label for="txKeyInputField" class="tx-key-label">Nhập Key kích hoạt:</label>
              <span class="tx-key-hint">Không phân biệt chữ hoa/thường</span>
            </div>

            <div class="tx-key-input-box" id="txKeyInputBox">
              <span class="tx-key-icon" aria-hidden="true">🔑</span>
              <input 
                type="text" 
                id="txKeyInputField" 
                class="tx-key-input" 
                placeholder="Nhập key kích hoạt..." 
                autocomplete="off" 
                autocorrect="off" 
                autocapitalize="off" 
                spellcheck="false"
                required
              >
              <button type="button" class="tx-key-paste-btn" id="txKeyPasteBtn" title="Dán key từ bộ nhớ tạm">
                <span>📋 Dán</span>
              </button>
            </div>

            <div class="tx-key-feedback" id="txKeyFeedback" aria-live="polite"></div>
          </div>

          <div class="tx-key-actions">
            <button type="button" class="tx-key-btn cancel" id="txKeyCancelBtn">Đóng</button>
            <button type="submit" class="tx-key-btn submit" id="txKeySubmitBtn">
              <span class="btn-text">Xác nhận &amp; Tải ngay</span>
              <span class="btn-arrow">⇩</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  function createModal() {
    if (document.getElementById('txKeyOverlay')) return;
    const temp = document.createElement('div');
    temp.innerHTML = keyModalHtml;
    while (temp.firstChild) {
      document.body.appendChild(temp.firstChild);
    }
  }

  function openKeyModal(toolId) {
    const tool = TOOL_DATA[toolId];
    if (!tool) {
      console.warn('Tool không tồn tại trong danh sách:', toolId);
      return;
    }

    createModal();

    currentTool = tool;
    const overlay = document.getElementById('txKeyOverlay');
    const toolNameEl = document.getElementById('txKeyToolName');
    const input = document.getElementById('txKeyInputField');
    const inputBox = document.getElementById('txKeyInputBox');
    const feedback = document.getElementById('txKeyFeedback');
    const submitBtn = document.getElementById('txKeySubmitBtn');

    if (toolNameEl) toolNameEl.textContent = tool.name;
    if (input) {
      input.value = '';
      input.disabled = false;
    }
    if (inputBox) {
      inputBox.classList.remove('error', 'success');
    }
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'tx-key-feedback';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      const btnText = submitBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = tool.isGroupRedirect ? 'Xác nhận & Vào nhóm' : 'Xác nhận & Tải ngay';
      }
    }

    if (overlay) {
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Auto focus ô input sau animation
      setTimeout(() => {
        if (input) input.focus();
      }, 150);
    }
  }

  function closeKeyModal() {
    const overlay = document.getElementById('txKeyOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentTool = null;
  }

  function showFeedback(type, message) {
    const feedback = document.getElementById('txKeyFeedback');
    const inputBox = document.getElementById('txKeyInputBox');
    if (!feedback || !inputBox) return;

    feedback.className = `tx-key-feedback ${type}`;
    feedback.textContent = message;

    inputBox.classList.remove('error', 'success');
    inputBox.classList.add(type);

    if (type === 'error') {
      inputBox.classList.remove('shake');
      // Trigger reflow to restart animation
      void inputBox.offsetWidth;
      inputBox.classList.add('shake');

      // Highlight card thông báo nhận key
      const noticeCard = document.getElementById('txKeyNoticeCard');
      if (noticeCard) {
        noticeCard.classList.add('pulse-glow');
        setTimeout(() => {
          noticeCard.classList.remove('pulse-glow');
        }, 1500);
      }
    }
  }

  function handleVerifyKey(e) {
    if (e) e.preventDefault();
    if (!currentTool) return;

    const input = document.getElementById('txKeyInputField');
    const submitBtn = document.getElementById('txKeySubmitBtn');
    if (!input) return;

    const enteredKey = input.value.trim().toLowerCase();
    const expectedKey = currentTool.key.toLowerCase();

    if (!enteredKey) {
      showFeedback('error', '⚠ Vui lòng nhập key trước khi nhấn Xác nhận.');
      input.focus();
      return;
    }

    if (enteredKey === expectedKey) {
      // Key chính xác!
      const successMsg = currentTool.customSuccessMsg || `✦ Key chính xác! Đang bắt đầu tải ${currentTool.name}...`;
      showFeedback('success', successMsg);

      if (submitBtn) submitBtn.disabled = true;
      input.disabled = true;

      const targetUrl = currentTool.url;

      setTimeout(() => {
        // Mở link tải hoặc chuyển hướng an toàn trong tab mới
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Đóng modal sau khi mở
        setTimeout(closeKeyModal, 600);
      }, 700);

    } else {
      // Key không chính xác
      showFeedback(
        'error',
        '✕ Key không chính xác! Hãy gia nhập nhóm Telegram hoặc Discord phía trên để nhận key tải 100% FREE.'
      );
      input.select();
    }
  }

  async function handlePaste() {
    const input = document.getElementById('txKeyInputField');
    if (!input) return;
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          input.value = text.trim();
          input.focus();
          showFeedback('', '');
        }
      } else {
        input.focus();
        document.execCommand('paste');
      }
    } catch (err) {
      input.focus();
      showFeedback('error', 'Không thể truy cập Clipboard. Bạn hãy dán bằng phím Ctrl+V.');
    }
  }

  function initKeyAuth() {
    createModal();

    const overlay = document.getElementById('txKeyOverlay');
    const closeBtn = document.getElementById('txKeyCloseBtn');
    const cancelBtn = document.getElementById('txKeyCancelBtn');
    const form = document.getElementById('txKeyForm');
    const pasteBtn = document.getElementById('txKeyPasteBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeKeyModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeKeyModal);
    if (form) form.addEventListener('submit', handleVerifyKey);
    if (pasteBtn) pasteBtn.addEventListener('click', handlePaste);

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeKeyModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        closeKeyModal();
      }
    });

    // Bắt sự kiện click cho toàn bộ nút có thuộc tính data-tool-key
    document.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('[data-tool-key]');
      if (targetBtn) {
        e.preventDefault();
        const toolId = targetBtn.getAttribute('data-tool-key');
        openKeyModal(toolId);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeyAuth);
  } else {
    initKeyAuth();
  }

  // API hỗ trợ mở modal từ console hoặc script khác
  window.TxKeyAuth = {
    open: openKeyModal,
    close: closeKeyModal,
    tools: TOOL_DATA
  };
})();
