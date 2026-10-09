(function () {
  const tabBtns = document.querySelectorAll('.guide-tab-btn');
  const cards = document.querySelectorAll('.guide-card');
  const allPanels = document.querySelectorAll('.video-panel, .doc-guide-panel');
  const videoPanel = document.getElementById('videoPanel');
  const frame = document.getElementById('videoFrame');
  const videoTitle = document.getElementById('videoTitle');

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

  function showPanel(panel) {
    if (!panel) return;
    panel.hidden = false;
    panel.querySelectorAll('iframe[data-src]').forEach(embed => {
      embed.src = embed.dataset.src;
    });
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Xử lý bộ lọc tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      hideAllPanels();

      cards.forEach(card => {
        const cat = card.dataset.category || 'pc';
        const catList = cat.split(' ');
        const game = card.dataset.game || '';
        const gameList = game.split(' ');
        if (filter === 'all' || gameList.includes(filter) || catList.includes(filter)) {
          card.classList.remove('is-hidden');
        } else {
          card.classList.add('is-hidden');
        }
      });

      // Nếu chọn tab sửa lỗi Unicore, tự động mở panel sửa lỗi
      if (filter === 'troubleshoot') {
        const fixPanel = document.getElementById('panel-unicore-fix');
        showPanel(fixPanel);
      }
    });
  });

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
      setTimeout(() => matchCard.click(), 250);
    }
  }
})();
