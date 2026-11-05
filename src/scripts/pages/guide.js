(function () {
  const cards = document.querySelectorAll('.guide-card');
  const allPanels = document.querySelectorAll('.video-panel, .doc-guide-panel');
  const videoPanel = document.getElementById('videoPanel');
  const frame = document.getElementById('videoFrame');
  const videoTitle = document.getElementById('videoTitle');

  const collapseBtn = document.getElementById('guideCollapseBtn');
  const collapseBody = document.getElementById('guideCollapseBody');
  const collapseStateText = document.getElementById('guideCollapseStateText');

  const featCollapseBtn = document.getElementById('featuresCollapseBtn');
  const featCollapseBody = document.getElementById('featuresCollapseBody');
  const featCollapseStateText = document.getElementById('featuresCollapseStateText');

  // Xử lý thu gọn / mở rộng khối "Chức năng Tool"
  if (featCollapseBtn && featCollapseBody) {
    featCollapseBtn.addEventListener('click', () => {
      const isExpanded = featCollapseBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        featCollapseBtn.setAttribute('aria-expanded', 'false');
        featCollapseBody.classList.add('is-collapsed');
        if (featCollapseStateText) featCollapseStateText.textContent = 'Mở rộng';
      } else {
        featCollapseBtn.setAttribute('aria-expanded', 'true');
        featCollapseBody.classList.remove('is-collapsed');
        if (featCollapseStateText) featCollapseStateText.textContent = 'Thu gọn';
      }
    });
  }

  // Xử lý thu gọn / mở rộng khối "Cách cài tool"
  if (collapseBtn && collapseBody) {
    collapseBtn.addEventListener('click', () => {
      const isExpanded = collapseBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        collapseBtn.setAttribute('aria-expanded', 'false');
        collapseBody.classList.add('is-collapsed');
        if (collapseStateText) collapseStateText.textContent = 'Mở rộng';
      } else {
        collapseBtn.setAttribute('aria-expanded', 'true');
        collapseBody.classList.remove('is-collapsed');
        if (collapseStateText) collapseStateText.textContent = 'Thu gọn';
      }
    });
  }

  // Ẩn tất cả các panel
  function hideAllPanels() {
    allPanels.forEach(panel => {
      panel.hidden = true;
      panel.querySelectorAll('video, audio').forEach(media => media.pause());
      panel.querySelectorAll('iframe').forEach(embed => {
        if (embed.getAttribute('src') && embed.getAttribute('src') !== 'about:blank') {
          embed.src = 'about:blank';
        }
      });
    });
    cards.forEach(c => c.classList.remove('is-active-card'));
  }

  // Hiển thị panel và cuộn mượt đưa vào phần hướng dẫn
  function showPanel(panel) {
    if (!panel) return;
    panel.hidden = false;
    panel.querySelectorAll('iframe[data-src]').forEach(embed => {
      embed.src = embed.dataset.src;
    });

    setTimeout(() => {
      const navOffset = 90;
      const elementPosition = panel.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }, 50);
  }

  // Xử lý click từng thẻ tool
  cards.forEach(card => {
    card.addEventListener('click', () => {
      hideAllPanels();
      card.classList.add('is-active-card');

      const videoUrl = card.dataset.video;
      const targetPanelId = card.dataset.targetPanel;

      if (videoUrl) {
        if (videoTitle) videoTitle.textContent = card.dataset.title || 'Video Hướng Dẫn';
        const cardImg = card.querySelector('.tool-app-icon');
        const videoIcon = document.getElementById('videoToolIcon');
        if (cardImg && videoIcon) {
          videoIcon.src = cardImg.src;
          videoIcon.alt = card.dataset.toolId || 'Tool Icon';
        }
        if (frame) {
          const videoSource = new URL(videoUrl, window.location.href);
          videoSource.searchParams.set('autoplay', '1');
          frame.src = videoSource.href;
        }
        showPanel(videoPanel);
      } else if (targetPanelId) {
        const targetPanel = document.getElementById(targetPanelId);
        showPanel(targetPanel);
      }
    });
  });

  // Nút đóng tất cả panel
  document.querySelectorAll('.panel-close-btn').forEach(btn => {
    btn.addEventListener('click', hideAllPanels);
  });

  // Phím tắt nhảy sang mục sửa lỗi Unicore
  document.querySelectorAll('.js-switch-to-fix').forEach(btn => {
    btn.addEventListener('click', () => {
      hideAllPanels();
      const fixPanel = document.getElementById('panel-unicore-fix');
      const fixCard = document.querySelector('[data-tool-id="unicore-fix"]');
      if (fixCard) fixCard.classList.add('is-active-card');
      showPanel(fixPanel);
    });
  });

  // Tự động mở đúng tool khi có URL query ?tool=... hoặc hash
  const urlParams = new URLSearchParams(window.location.search);
  const targetQuery = (urlParams.get('tool') || window.location.hash.replace('#', '')).toLowerCase();
  if (targetQuery) {
    const allCards = Array.from(cards);
    const matchCard = allCards.find(c => (c.dataset.toolId || '').toLowerCase() === targetQuery) || allCards.find(c => {
      const tid = (c.dataset.toolId || '').toLowerCase();
      const title = (c.dataset.title || '').toLowerCase();
      const strong = c.querySelector('strong') ? c.querySelector('strong').textContent.toLowerCase() : '';
      return tid === targetQuery || tid.includes(targetQuery) || title.includes(targetQuery) || strong.includes(targetQuery);
    });
    if (matchCard) {
      if (collapseBtn && collapseBody && collapseBtn.getAttribute('aria-expanded') === 'false') {
        collapseBtn.click();
      }
      setTimeout(() => matchCard.click(), 250);
    }
  }
})();
