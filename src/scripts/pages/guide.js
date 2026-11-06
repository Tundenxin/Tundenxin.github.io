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

  // Xử lý hiệu ứng thu gọn / mở rộng mượt mà (Smooth Accordion Animation)
  function setupCollapsible(btn, body, stateText) {
    if (!btn || !body) return;

    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        // ĐANG MỞ -> THU GỌN LẠI
        btn.setAttribute('aria-expanded', 'false');
        if (stateText) stateText.textContent = 'Mở rộng';

        // 1. Cố định chiều cao hiện tại của body để CSS transition nhận mốc bắt đầu
        const currentHeight = body.scrollHeight;
        body.style.maxHeight = currentHeight + 'px';
        body.offsetHeight; // Kích hoạt reflow trình duyệt

        // 2. Chuyển về trạng thái đóng (animate về 0px và mờ dần)
        requestAnimationFrame(() => {
          body.classList.add('is-collapsed');
          body.style.maxHeight = '0px';
        });

        const onCollapseEnd = (e) => {
          if (e.target === body && (e.propertyName === 'max-height' || e.propertyName === 'opacity')) {
            body.style.maxHeight = '';
            body.removeEventListener('transitionend', onCollapseEnd);
          }
        };
        body.addEventListener('transitionend', onCollapseEnd);
      } else {
        // ĐANG ĐÓNG -> MỞ RỘNG RA
        btn.setAttribute('aria-expanded', 'true');
        if (stateText) stateText.textContent = 'Thu gọn';

        body.classList.remove('is-collapsed');
        // Tính toán toàn bộ chiều cao thực tế cần mở
        body.style.maxHeight = 'none';
        const targetHeight = body.scrollHeight;
        body.style.maxHeight = '0px';
        body.offsetHeight; // Kích hoạt reflow trình duyệt

        // Animate mượt mà từ 0px đến targetHeight px
        requestAnimationFrame(() => {
          body.style.maxHeight = targetHeight + 'px';
        });

        const onExpandEnd = (e) => {
          if (e.target === body && e.propertyName === 'max-height') {
            if (btn.getAttribute('aria-expanded') === 'true') {
              body.style.maxHeight = 'none'; // Tháo bỏ cố định chiều cao để nội dung co giãn tự nhiên
            }
            body.removeEventListener('transitionend', onExpandEnd);
          }
        };
        body.addEventListener('transitionend', onExpandEnd);
      }
    });
  }

  // Khởi tạo cho 2 khối "Cách cài tool" & "Chức năng Tool"
  setupCollapsible(collapseBtn, collapseBody, collapseStateText);
  setupCollapsible(featCollapseBtn, featCollapseBody, featCollapseStateText);

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
