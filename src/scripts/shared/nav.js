// nav.js — Quản lý Menu điều hướng di động (Mobile Side Drawer)
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileNavDrawer');
    const overlay = document.getElementById('mobileNavOverlay');
    const closeBtn = document.getElementById('closeMobileNavBtn');
    const drawerLinks = drawer ? drawer.querySelectorAll('.drawer-nav-item, .drawer-social-item') : [];

    function openNav() {
      if (!drawer || !overlay) return;
      drawer.classList.add('open');
      overlay.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-drawer-open');
    }

    function closeNav() {
      if (!drawer || !overlay) return;
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-drawer-open');
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (drawer && drawer.classList.contains('open')) {
          closeNav();
        } else {
          openNav();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeNav();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeNav();
      });
    }

    // Đóng drawer khi người dùng click vào link điều hướng
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeNav();
      });
    });

    // Hỗ trợ phím Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
        closeNav();
      }
    });
  });
})();
