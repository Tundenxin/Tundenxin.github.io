/**
 * Tundenxin Documentation Portal Controller
 * Professional GitBook / Docs layout with searchable tree navigation
 */
(function () {
  'use strict';

  // Elements
  const sidebar = document.getElementById('docsSidebar');
  const backdrop = document.getElementById('docsSidebarBackdrop');
  const mobileToggle = document.getElementById('docsMobileDrawerBtn');
  const sidebarClose = document.getElementById('docsSidebarCloseBtn');
  const searchInput = document.getElementById('docsSearchInput');

  const navBtns = document.querySelectorAll('.docs-nav-btn');
  const articlePanels = document.querySelectorAll('.docs-article-panel');

  const breadcrumbGame = document.getElementById('docsBreadcrumbGame');
  const breadcrumbCurrent = document.getElementById('docsBreadcrumbCurrent');
  const mainContent = document.getElementById('docsMainContent');
  const articleView = document.getElementById('docsArticleView');
  const tocContainer = document.getElementById('docsTocContainer');
  const tocList = document.getElementById('docsTocList');
  let activeTocEntries = [];

  // Video panel elements
  const videoPanel = document.getElementById('videoPanel');
  const videoFrame = document.getElementById('videoFrame');
  const videoTitle = document.getElementById('videoTitle');
  const videoIcon = document.getElementById('videoToolIcon');

  // Mở / đóng Mobile Drawer
  function openMobileDrawer() {
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileDrawer);
  if (sidebarClose) sidebarClose.addEventListener('click', closeMobileDrawer);
  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);

  // ------------------------------------------------------------------------
  // CUỘN MƯỢT ĐẾN PHẦN TỬ TRONG MAIN CONTENT
  // ------------------------------------------------------------------------
  function scrollToElement(targetEl) {
    if (!targetEl) return;
    const isDesktop = window.innerWidth > 992;
    if (!isDesktop) {
      const topOffset = targetEl.getBoundingClientRect().top + window.pageYOffset - 85;
      window.scrollTo({
        top: Math.max(0, topOffset),
        behavior: 'smooth'
      });
    } else {
      const scrollEl = document.getElementById('docsArticleView') || mainContent;
      if (scrollEl) {
        const containerRect = scrollEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + scrollEl.scrollTop - 14;
        scrollEl.scrollTo({
          top: Math.max(0, relativeTop),
          behavior: 'smooth'
        });
      }
    }
  }

  // ------------------------------------------------------------------------
  // TẠO MỤC LỤC BÊN PHẢI (ON THIS PAGE / TOC)
  // Khớp giao diện GitBook / Docs WibuzStore
  // ------------------------------------------------------------------------
  function buildTableOfContents(targetPanel) {
    if (!tocContainer || !tocList) return;
    tocList.innerHTML = '';
    activeTocEntries = [];

    if (!targetPanel) {
      tocContainer.style.display = 'none';
      return;
    }

    const items = [];

    // TH1: Card bước theo kiểu thẻ (.doc-step-card) như Kuro Mobile, Eleutheria, FAQ
    const stepCards = targetPanel.querySelectorAll('.doc-step-card');
    if (stepCards.length > 0) {
      stepCards.forEach((card, idx) => {
        if (!card.id) {
          card.id = `${targetPanel.id}-step-${idx + 1}`;
        }
        const badge = card.querySelector('.doc-step-badge');
        const h3 = card.querySelector('h3');
        const badgeText = badge ? badge.textContent.trim() : `Bước ${idx + 1}`;
        let titleText = h3 ? h3.textContent.trim() : '';

        // Xóa các tiền tố số nếu h3 đã có sẵn (vd "1. " trong h3 của FAQ)
        titleText = titleText.replace(/^\d+[\.\:\-]\s*/, '');

        let displayLabel = titleText ? `${badgeText}: ${titleText}` : badgeText;
        displayLabel = displayLabel.replace(/^BƯỚC\s+(\d+)/i, 'Bước $1');

        items.push({
          id: card.id,
          el: card,
          title: displayLabel,
          isNested: false
        });
      });
    } else {
      // TH3: GitBook Markdown Panel (Shika, Unicore, Lotus, Shibal, Troubleshooting...)
      const markdown = targetPanel.querySelector('.markdown') || targetPanel;
      const headings = markdown.querySelectorAll('h2, h3');

      headings.forEach((heading, idx) => {
        // Bỏ qua heading nằm trong details/expandable dropdown
        if (heading.closest('.expandable-body')) return;

        if (!heading.id) {
          heading.id = `${targetPanel.id}-heading-${idx + 1}`;
        }

        // Lấy tiêu đề sạch không dính ký tự # của anchor
        const anchor = heading.querySelector('.heading-anchor');
        let title = '';
        if (anchor) {
          const clone = heading.cloneNode(true);
          const a = clone.querySelector('.heading-anchor');
          if (a) a.remove();
          title = clone.textContent.trim();
        } else {
          title = heading.textContent.trim();
        }

        if (!title) return;

        items.push({
          id: heading.id,
          el: heading,
          title: title,
          isNested: heading.tagName.toLowerCase() === 'h3'
        });
      });
    }

    // Nếu không có mục nào, ẩn bảng mục lục để bài viết hiển thị rộng rãi
    if (items.length === 0) {
      tocContainer.style.display = 'none';
      return;
    }

    tocContainer.style.display = '';

    // Render danh sách mục lục
    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'docs-toc-item';

      const a = document.createElement('a');
      a.className = 'docs-toc-link' + (item.isNested ? ' is-nested' : '');
      if (idx === 0) a.classList.add('is-active');
      a.href = `#${item.id}`;
      a.textContent = item.title;
      a.title = item.title;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToElement(item.el);
        tocList.querySelectorAll('.docs-toc-link').forEach(link => link.classList.remove('is-active'));
        a.classList.add('is-active');
      });

      li.appendChild(a);
      tocList.appendChild(li);

      activeTocEntries.push({
        el: item.el,
        linkEl: a
      });
    });
  }

  // ------------------------------------------------------------------------
  // SCROLL-SPY: TỰ ĐỘNG CẬP NHẬT MỤC LỤC THEO VỊ TRÍ ĐANG ĐỌC
  // ------------------------------------------------------------------------
  function updateActiveTocOnScroll() {
    if (!activeTocEntries || activeTocEntries.length === 0) return;
    const isDesktop = window.innerWidth > 992;
    const scrollEl = (isDesktop && (document.getElementById('docsArticleView') || mainContent)) ? (document.getElementById('docsArticleView') || mainContent) : null;
    const containerTop = (isDesktop && scrollEl) ? scrollEl.getBoundingClientRect().top : 0;
    const offset = 80;

    let currentItem = activeTocEntries[0];
    for (let i = 0; i < activeTocEntries.length; i++) {
      const entry = activeTocEntries[i];
      const rect = entry.el.getBoundingClientRect();
      const relativeTop = rect.top - containerTop;
      if (relativeTop <= offset) {
        currentItem = entry;
      } else {
        break;
      }
    }

    if (currentItem && currentItem.linkEl) {
      if (!currentItem.linkEl.classList.contains('is-active')) {
        tocList.querySelectorAll('.docs-toc-link').forEach(l => l.classList.remove('is-active'));
        currentItem.linkEl.classList.add('is-active');
      }
    }
  }

  let scrollTicking = false;
  function handleScrollSpy() {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        updateActiveTocOnScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  const articleViewEl = document.getElementById('docsArticleView');
  if (articleViewEl) {
    articleViewEl.addEventListener('scroll', handleScrollSpy, { passive: true });
  }
  if (mainContent) {
    mainContent.addEventListener('scroll', handleScrollSpy, { passive: true });
  }
  window.addEventListener('scroll', handleScrollSpy, { passive: true });

  // Dừng video đang phát khi chuyển bài
  function stopActiveVideo() {
    if (videoFrame && videoFrame.getAttribute('src') && videoFrame.getAttribute('src') !== 'about:blank') {
      videoFrame.src = 'about:blank';
    }
  }

  // Chuyển tab hiển thị tài liệu
  function switchDoc(targetId, navBtn) {
    if (!targetId) return;

    // Tìm panel mục tiêu
    const targetPanel = document.getElementById(targetId);
    if (!targetPanel) return;

    stopActiveVideo();

    // 1. Cập nhật trạng thái Active trên Panels
    articlePanels.forEach(p => p.classList.remove('is-active'));
    targetPanel.classList.add('is-active');

    // Tự động sinh bảng mục lục các bước bên phải cho bài viết này
    buildTableOfContents(targetPanel);

    // 2. Kích hoạt iframe lazy nếu có
    targetPanel.querySelectorAll('iframe[data-src]').forEach(embed => {
      if (!embed.getAttribute('src') || embed.getAttribute('src') === 'about:blank') {
        embed.src = embed.dataset.src;
      }
    });

    // 3. Nếu là Video Panel, load video YouTube tương ứng
    if (navBtn && navBtn.dataset.video) {
      if (videoTitle) videoTitle.textContent = navBtn.dataset.title || 'Video Hướng Dẫn';
      const navImg = navBtn.querySelector('.docs-nav-icon');
      if (navImg && videoIcon) {
        videoIcon.src = navImg.src;
        videoIcon.alt = navBtn.dataset.tool || 'Tool Icon';
      }
      if (videoFrame) {
        try {
          const videoSource = new URL(navBtn.dataset.video, window.location.href);
          videoSource.searchParams.set('autoplay', '1');
          videoFrame.src = videoSource.href;
        } catch {
          videoFrame.src = navBtn.dataset.video;
        }
      }
    }

    // 4. Cập nhật trạng thái Active trên Sidebar Buttons
    navBtns.forEach(btn => btn.classList.remove('is-active'));
    if (navBtn) {
      navBtn.classList.add('is-active');
    } else {
      // Tìm button tương ứng theo targetId hoặc data-tool
      const matchingBtn = document.querySelector(`.docs-nav-btn[data-target="${targetId}"]`);
      if (matchingBtn) matchingBtn.classList.add('is-active');
    }

    // Đảm bảo nhóm cha không bị thu gọn khi chọn bài
    const currentActiveBtn = navBtn || document.querySelector(`.docs-nav-btn[data-target="${targetId}"]`);
    if (currentActiveBtn) {
      const parentCollapsible = currentActiveBtn.closest('.docs-nav-group.is-collapsible');
      if (parentCollapsible && parentCollapsible.classList.contains('is-collapsed')) {
        parentCollapsible.classList.remove('is-collapsed');
        const parentLabel = parentCollapsible.querySelector('.docs-group-label');
        if (parentLabel) parentLabel.setAttribute('aria-expanded', 'true');
        if (typeof saveCollapsedGroups === 'function') saveCollapsedGroups();
      }
    }

    // 5. Cập nhật Breadcrumbs
    const activeBtn = document.querySelector('.docs-nav-btn.is-active');
    if (activeBtn) {
      const toolTitle = activeBtn.querySelector('.docs-nav-text')
        ? activeBtn.querySelector('.docs-nav-text').textContent.trim()
        : activeBtn.textContent.trim();
      const parentGroup = activeBtn.closest('.docs-nav-group');
      const groupLabel = parentGroup ? parentGroup.querySelector('.docs-group-label') : null;
      const labelTextEl = groupLabel ? groupLabel.querySelector('.docs-group-label-text') : null;
      const rawText = labelTextEl ? labelTextEl.textContent : (groupLabel ? groupLabel.textContent : '');
      const gameTitle = rawText.replace(/[📌🎮🌊🚂⚡🌌📁🛠️🗺️]/g, '').trim() || 'Genshin Impact';

      if (breadcrumbGame) {
        breadcrumbGame.textContent = gameTitle;
        breadcrumbGame.style.display = 'inline';
        const prevSep = breadcrumbGame.previousElementSibling;
        if (prevSep && prevSep.classList.contains('sep')) prevSep.style.display = 'inline';
        const nextSep = breadcrumbGame.nextElementSibling;
        if (nextSep && nextSep.classList.contains('sep')) nextSep.style.display = 'inline';
      }
      if (breadcrumbCurrent) {
        breadcrumbCurrent.textContent = toolTitle;
      }

      // Cập nhật URL Hash / Query để dễ lưu bookmark hoặc chia sẻ link
      const toolId = activeBtn.dataset.tool || targetId.replace('panel-', '');
      if (toolId && history.replaceState) {
        if (toolId === 'faq') {
          // Khi ở trang FAQ mặc định, giữ URL sạch
          history.replaceState({ tool: 'faq' }, '', window.location.pathname);
        } else {
          const newUrl = `${window.location.pathname}?tool=${encodeURIComponent(toolId)}`;
          history.replaceState({ tool: toolId }, '', newUrl);
        }
      }
    }

    // 6. Đóng mobile drawer nếu đang mở
    closeMobileDrawer();

    // 7. Cuộn lên đầu bài viết
    const scrollEl = document.getElementById('docsArticleView') || mainContent;
    if (scrollEl) {
      if (window.innerWidth <= 992) {
        const topOffset = scrollEl.getBoundingClientRect().top + window.pageYOffset - 85;
        window.scrollTo({
          top: Math.max(0, topOffset),
          behavior: 'smooth'
        });
      } else {
        // Trên Desktop: Cuộn mượt nội dung bài viết về đầu, không làm trượt TOC
        scrollEl.scrollTop = 0;
        if (mainContent && mainContent !== scrollEl) {
          mainContent.scrollTop = 0;
        }
      }
      handleScrollSpy();
    }
  }

  // Gắn sự kiện click cho các nút trong Sidebar
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      switchDoc(targetId, btn);
    });
  });

  // Hỗ trợ các thẻ điều hướng nhanh trên trang Chào mừng (Quick Cards)
  document.querySelectorAll('.js-quick-doc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.target;
      const matchingBtn = document.querySelector(`.docs-nav-btn[data-target="${targetId}"]`) ||
                          document.querySelector(`.docs-nav-btn[data-tool="${link.dataset.tool}"]`);
      switchDoc(targetId, matchingBtn);
    });
  });

  // Nút đóng Panel (quay về trang FAQ mặc định hoặc đóng video)
  document.querySelectorAll('.panel-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stopActiveVideo();
      const defaultTargetBtn = document.querySelector('.docs-nav-btn[data-target="panel-faq"]') ||
                               document.querySelector('.docs-nav-btn');
      if (defaultTargetBtn) {
        switchDoc(defaultTargetBtn.dataset.target, defaultTargetBtn);
      }
    });
  });

  // Nút chuyển nhanh sang trang sửa lỗi (vd: từ Unicore)
  document.querySelectorAll('.js-switch-to-fix').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const fixBtn = document.querySelector('.docs-nav-btn[data-target="panel-unicore-fix"]');
      switchDoc('panel-unicore-fix', fixBtn);
    });
  });

  // ------------------------------------------------------------------------
  // TÌM KIẾM TÀI LIỆU NHANH (REALTIME INSTANT FILTER)
  // ------------------------------------------------------------------------
  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    const groups = document.querySelectorAll('.docs-nav-group');

    groups.forEach(group => {
      let visibleInGroup = 0;
      const items = group.querySelectorAll('.docs-nav-btn');

      items.forEach(item => {
        const title = item.textContent.toLowerCase();
        const tool = (item.dataset.tool || '').toLowerCase();
        const videoTitle = (item.dataset.title || '').toLowerCase();

        if (!q || title.includes(q) || tool.includes(q) || videoTitle.includes(q)) {
          item.style.display = 'flex';
          visibleInGroup++;
        } else {
          item.style.display = 'none';
        }
      });

      // Nếu đang tìm kiếm và có item khớp, tự động mở rộng nhóm
      if (q && visibleInGroup > 0 && group.classList.contains('is-collapsible')) {
        group.classList.remove('is-collapsed');
        const lbl = group.querySelector('.docs-group-label');
        if (lbl) lbl.setAttribute('aria-expanded', 'true');
      }

      // Nếu không có item nào khớp trong group, ẩn luôn tiêu đề group
      if (!q || visibleInGroup > 0) {
        group.style.display = 'block';
      } else {
        group.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    // Nhấn phím Escape để xóa tìm kiếm
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        handleSearch('');
        searchInput.blur();
      }
    });
  }

  // Phím tắt toàn cục: Ctrl + K hoặc / để kích hoạt tìm kiếm
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // ------------------------------------------------------------------------
  // THU GỌN / MỞ RỘNG CÁC NHÓM GAME TRONG SIDEBAR (COLLAPSIBLE GROUPS)
  // ------------------------------------------------------------------------
  const collapsibleGroups = document.querySelectorAll('.docs-nav-group.is-collapsible');

  function initCollapsibleGroups() {
    collapsibleGroups.forEach(group => {
      const label = group.querySelector('.docs-group-label');
      if (!label) return;

      const hasActive = group.querySelector('.docs-nav-btn.is-active');

      // Mặc định: Tất cả các nhóm đều đóng, chỉ mở nếu nhóm chứa nút đang active
      if (hasActive) {
        group.classList.remove('is-collapsed');
        label.setAttribute('aria-expanded', 'true');
      } else {
        group.classList.add('is-collapsed');
        label.setAttribute('aria-expanded', 'false');
      }

      function toggle() {
        const willCollapse = !group.classList.contains('is-collapsed');
        if (willCollapse) {
          group.classList.add('is-collapsed');
          label.setAttribute('aria-expanded', 'false');
        } else {
          group.classList.remove('is-collapsed');
          label.setAttribute('aria-expanded', 'true');
        }
      }

      label.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });

      label.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  initCollapsibleGroups();

  // ------------------------------------------------------------------------
  // DEEP LINKING (Tự động mở bài khi truy cập có ?tool=... hoặc #hash)
  // ------------------------------------------------------------------------
  function initDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawTarget = urlParams.get('tool') || window.location.hash.replace('#', '');
    const target = rawTarget ? rawTarget.trim().toLowerCase() : '';

    if (target) {
      // 1. Khớp chính xác data-tool
      let matchBtn = document.querySelector(`.docs-nav-btn[data-tool="${target}"]`);

      // 2. Khớp theo target ID (vd: panel-shika-pc)
      if (!matchBtn) {
        matchBtn = document.querySelector(`.docs-nav-btn[data-target="${target}"]`) ||
                   document.querySelector(`.docs-nav-btn[data-target="panel-${target}"]`);
      }

      // 3. Khớp mờ theo tiêu đề hoặc slug
      if (!matchBtn) {
        navBtns.forEach(btn => {
          const t = (btn.dataset.tool || '').toLowerCase();
          const text = btn.textContent.toLowerCase();
          if (t.includes(target) || text.includes(target)) {
            matchBtn = btn;
          }
        });
      }

      if (matchBtn) {
        const targetId = matchBtn.dataset.target;
        switchDoc(targetId, matchBtn);
        return;
      }
    }

    // Mặc định mở trang Câu hỏi thường gặp (FAQ)
    const defaultBtn = document.querySelector('.docs-nav-btn[data-target="panel-faq"]') ||
                       document.querySelector('.docs-nav-btn.is-active') ||
                       document.querySelector('.docs-nav-btn');
    if (defaultBtn) {
      switchDoc(defaultBtn.dataset.target, defaultBtn);
    }
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeepLink);
  } else {
    initDeepLink();
  }
})();
