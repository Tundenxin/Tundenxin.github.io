/**
 * Tundenxin — Quản lý Giao diện Tối (Dark Mode mặc định) & Sáng (Style 5: Clean Light)
 * - Mặc định: Tối (Dark Mode)
 * - Lưu tùy chọn người dùng vào localStorage ('tundenxin_theme')
 * - Đồng bộ icon, trạng thái nút bấm và meta theme-color trên mọi trang
 */
(function () {
  const STORAGE_KEY = 'tundenxin_theme';
  const LIGHT_META_COLOR = '#f4f7fb';
  const DARK_META_COLOR = '#0b0f19';

  const MOON_ICON = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;

  const SUN_ICON = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // Ignore storage errors in restricted contexts
    }
  }

  function updateToggleButtons(theme) {
    const isDark = theme === 'dark';
    const buttons = document.querySelectorAll('#themeToggleBtn, .js-theme-toggle');
    buttons.forEach((btn) => {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute(
        'title',
        isDark ? 'Chuyển sang giao diện Sáng (Kiểu 5)' : 'Bật chế độ Tối (Dark Mode)'
      );
      btn.setAttribute(
        'aria-label',
        isDark ? 'Chuyển sang giao diện Sáng' : 'Bật chế độ Tối'
      );

      const iconEl = btn.querySelector('.theme-toggle-icon');
      const labelEl = btn.querySelector('.theme-toggle-label');
      if (iconEl) iconEl.innerHTML = isDark ? SUN_ICON : MOON_ICON;
      if (labelEl) labelEl.textContent = isDark ? 'Sáng' : 'Tối';
    });
  }

  function applyTheme(theme, notify = true) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    if (normalized === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', normalized === 'dark' ? DARK_META_COLOR : LIGHT_META_COLOR);
    }

    updateToggleButtons(normalized);

    if (notify) {
      window.dispatchEvent(
        new CustomEvent('tundenxin:themechange', { detail: { theme: normalized } })
      );
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next, true);
  }

  // Apply immediately if DOM already has head
  applyTheme(getSavedTheme(), false);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getSavedTheme(), false);
    const buttons = document.querySelectorAll('#themeToggleBtn, .js-theme-toggle');
    buttons.forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });
  });

  window.TundenxinTheme = {
    get: getSavedTheme,
    set: (t) => {
      const normalized = t === 'dark' ? 'dark' : 'light';
      saveTheme(normalized);
      applyTheme(normalized, true);
    },
    toggle: toggleTheme,
  };
})();
