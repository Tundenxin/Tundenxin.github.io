/**
 * Tundenxin — Hiệu ứng Không Khí Halloween 2026 (Halloween Atmosphere & Spooky Night)
 * - Canvas hạt ma mị: đốm lửa ma thuật (cam, tím, lục), biểu tượng bay lơ lửng (🎃, 🦇, 👻, 🍬, ✨)
 * - Đàn dơi bay lướt ngang bầu trời đêm (flying bats flapping smoothly)
 * - Tự động tạo mạng nhện góc màn hình kèm chú nhện 🕷️ đung đưa tương tác
 * - Tự động gắn nón phù thủy 🧙‍♀️ lên Chibi Skirk & bí ngô 🎃 trên nút Hỗ trợ
 * - Tương tác chạm/click phát tia sáng ma thuật (spark burst)
 * - Tối ưu 60fps, tiết kiệm CPU/pin khi ẩn tab (Page Visibility API)
 * - Nút Bật/Tắt Halloween ở Footer, lưu tùy chọn vào localStorage
 */

(function () {
  const STORAGE_KEY = 'tundenxin_halloween_enabled';
  const FALLBACK_KEY = 'tundenxin_snow_enabled';
  let isHalloweenEnabled = true;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      isHalloweenEnabled = saved !== 'false';
    } else {
      const oldSnow = localStorage.getItem(FALLBACK_KEY);
      isHalloweenEnabled = oldSnow !== 'false';
    }
  } catch (e) {
    // Storage có thể bị chặn trên trình duyệt riêng tư
  }

  function savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, isHalloweenEnabled ? 'true' : 'false');
      localStorage.setItem(FALLBACK_KEY, isHalloweenEnabled ? 'true' : 'false');
    } catch (e) {}
  }

  let canvas, ctx;
  let width = 0, height = 0;
  let particles = [];
  let bats = [];
  let sparks = [];
  let animId = null;
  let nextBatSpawnTime = Date.now() + 2500;
  const mouse = { x: -1000, y: -1000, lastX: 0, vx: 0 };

  const HALLOWEEN_EMOJIS = ['🎃', '🦇', '👻', '🍬', '✨'];
  const EMBER_COLORS = [
    { color: '#f97316', glow: 'rgba(249, 115, 22, 0.65)' }, // Pumpkin Orange
    { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.65)' }, // Golden Amber
    { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.65)' }, // Lavender Witch
    { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.65)' }, // Deep Purple
    { color: '#4ade80', glow: 'rgba(74, 222, 128, 0.65)' }, // Ghostly Slime
    { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.65)' }  // Void Cryo
  ];

  function setupCanvas() {
    if (document.getElementById('snowCanvas')) {
      canvas = document.getElementById('snowCanvas');
      ctx = canvas.getContext('2d');
      resize();
      return;
    }

    canvas = document.createElement('canvas');
    canvas.id = 'snowCanvas';
    canvas.className = 'snow-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', debounce(resize, 120));

    window.addEventListener('mousemove', function (e) {
      mouse.vx = (e.clientX - mouse.lastX) * 0.08;
      mouse.lastX = e.clientX;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('click', function (e) {
      if (!isHalloweenEnabled) return;
      // Tránh cản trở thao tác trên các button, input hoặc modal
      const target = e.target;
      if (target.closest('button, a, input, select, textarea, .modal, .tx-dl-modal')) return;
      createSparkBurst(e.clientX, e.clientY);
    });

    createParticles();
    if (isHalloweenEnabled) {
      start();
    } else {
      canvas.style.display = 'none';
      toggleDecorations(false);
    }
  }

  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  function createParticles() {
    particles = [];
    const isMobile = window.innerWidth <= 768;
    const count = isMobile ? 14 : 26;

    for (let i = 0; i < count; i++) {
      particles.push(initParticle(false));
    }
  }

  function initParticle(fromTop) {
    const isEmoji = Math.random() < 0.28;
    const isMobile = window.innerWidth <= 768;

    if (isEmoji) {
      const emoji = HALLOWEEN_EMOJIS[Math.floor(Math.random() * HALLOWEEN_EMOJIS.length)];
      const size = isMobile ? Math.random() * 4 + 11 : Math.random() * 6 + 14;
      return {
        type: 'emoji',
        emoji: emoji,
        x: Math.random() * width,
        y: fromTop ? -25 - Math.random() * 20 : Math.random() * height,
        size: size,
        speedY: Math.random() * 0.45 + 0.35,
        speedX: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.015,
        sway: Math.random() * 0.9 + 0.4,
        opacity: Math.random() * 0.3 + 0.45
      };
    } else {
      const ember = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
      const radius = Math.random() * 1.5 + 0.9;
      // Một số đốm lửa ma thuật bay ngược lên trên, một số rơi chầm chậm
      const floatsUp = Math.random() < 0.35;
      return {
        type: 'ember',
        x: Math.random() * width,
        y: fromTop 
          ? (floatsUp ? height + 10 + Math.random() * 20 : -15 - Math.random() * 20) 
          : Math.random() * height,
        radius: radius,
        speedY: floatsUp ? -(Math.random() * 0.5 + 0.3) : (Math.random() * 0.45 + 0.25),
        speedX: (Math.random() - 0.5) * 0.35,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: Math.random() * 0.015 + 0.005,
        sway: Math.random() * 0.8 + 0.3,
        opacity: Math.random() * 0.35 + 0.25,
        color: ember.color,
        glow: ember.glow,
        floatsUp: floatsUp
      };
    }
  }

  function spawnBat() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startX = dir === 1 ? -60 : width + 60;
    const targetY = Math.random() * (height * 0.42) + 30;
    const isMobile = window.innerWidth <= 768;
    bats.push({
      x: startX,
      y: targetY,
      baseY: targetY,
      dir: dir,
      speedX: (Math.random() * 0.7 + 1.8) * dir,
      size: isMobile ? Math.random() * 4 + 16 : Math.random() * 6 + 20,
      wingPhase: Math.random() * Math.PI,
      wingSpeed: Math.random() * 0.08 + 0.2,
      opacity: Math.random() * 0.25 + 0.7
    });
  }

  function createSparkBurst(x, y) {
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.4;
      const speed = Math.random() * 2.8 + 1.2;
      const ember = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
      sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2 + 1.2,
        color: ember.color,
        glow: ember.glow,
        opacity: 0.95,
        decay: Math.random() * 0.03 + 0.025
      });
    }
  }

  function update() {
    animId = null;
    if (!isHalloweenEnabled || document.hidden) return;
    if (!ctx) return;
    if (document.body.classList.contains('nav-drawer-open')) {
      animId = requestAnimationFrame(update);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Cập nhật và vẽ các hạt Halloween (Đốm lửa & Emojis)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.angularSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.angle) * p.sway;

      // Phản ứng gió nhẹ khi chuột di chuyển lại gần
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0 && distSq < 7200) {
        const dist = Math.sqrt(distSq);
        const force = (85 - dist) / 85;
        p.x -= (dx / dist) * force * 1.5;
        p.y -= (dy / dist) * force * 0.6;
      }

      // Tái tạo khi rơi ra ngoài màn hình
      if (p.floatsUp) {
        if (p.y < -30 || p.x < -30 || p.x > width + 30) {
          particles[i] = initParticle(true);
        }
      } else {
        if (p.y > height + 30 || p.x < -30 || p.x > width + 30) {
          particles[i] = initParticle(true);
        }
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;

      if (p.type === 'emoji') {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.angle) * 0.25);
        ctx.font = `${p.size}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(249, 115, 22, 0.65)';
        ctx.shadowBlur = 8;
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = p.radius * 2.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Cập nhật và vẽ đàn dơi bay lướt qua bầu trời
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i];
      b.x += b.speedX;
      b.wingPhase += b.wingSpeed;
      b.y = b.baseY + Math.sin(b.wingPhase * 1.2) * 14;

      ctx.save();
      ctx.globalAlpha = b.opacity;
      ctx.translate(b.x, b.y);
      if (b.dir < 0) ctx.scale(-1, 1);
      const flap = 0.65 + Math.sin(b.wingPhase) * 0.35;
      ctx.scale(1, flap);

      ctx.font = `${b.size}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(168, 85, 247, 0.75)';
      ctx.shadowBlur = 10;
      ctx.fillText('🦇', 0, 0);
      ctx.restore();

      if ((b.dir === 1 && b.x > width + 80) || (b.dir === -1 && b.x < -80)) {
        bats.splice(i, 1);
      }
    }

    // Tự động sinh dơi định kỳ
    if (Date.now() > nextBatSpawnTime && bats.length < 2) {
      spawnBat();
      nextBatSpawnTime = Date.now() + Math.random() * 11000 + 7000;
    }

    // 3. Cập nhật tia sáng ma thuật (Click sparks)
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.05; // Trọng lực nhẹ
      s.opacity -= s.decay;

      if (s.opacity <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.glow;
      ctx.shadowBlur = s.radius * 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animId = requestAnimationFrame(update);
  }

  function start() {
    if (!animId && ctx && !document.hidden) {
      animId = requestAnimationFrame(update);
    }
    if (canvas) canvas.style.display = 'block';
    toggleDecorations(true);
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, width, height);
      canvas.style.display = 'none';
    }
    toggleDecorations(false);
  }

  function toggleHalloween() {
    isHalloweenEnabled = !isHalloweenEnabled;
    savePreference();
    if (isHalloweenEnabled) {
      start();
    } else {
      stop();
    }
    updateToggleButtons();
  }

  function updateToggleButtons() {
    document.querySelectorAll('.footer-snow-btn, #toggleSnowBtn').forEach(btn => {
      btn.innerHTML = isHalloweenEnabled ? '🎃 Halloween: Bật' : '🎃 Halloween: Tắt';
      btn.classList.toggle('active', isHalloweenEnabled);
      btn.title = isHalloweenEnabled ? 'Nhấn để tắt hiệu ứng Halloween' : 'Nhấn để bật hiệu ứng Halloween';
    });
  }

  function toggleDecorations(show) {
    document.body.classList.toggle('halloween-off', !show);
    const decor = document.getElementById('halloweenDecorations');
    if (decor) {
      decor.style.display = show ? 'block' : 'none';
    }
    const pumpkins = document.querySelectorAll('.support-halloween-badge');
    pumpkins.forEach(p => p.style.display = show ? 'block' : 'none');
  }

  // Tự động kiểm tra và chèn các yếu tố trang trí Halloween nếu chưa có sẵn
  function injectDecorations() {
    // 1. Mạng nhện & Nhện đung đưa ở 2 góc
    if (!document.getElementById('halloweenDecorations')) {
      const decorWrap = document.createElement('div');
      decorWrap.id = 'halloweenDecorations';
      decorWrap.className = 'halloween-decorations';
      decorWrap.setAttribute('aria-hidden', 'true');
      decorWrap.innerHTML = `
        <div class="halloween-cobweb cobweb-left">
          <svg viewBox="0 0 120 120" width="120" height="120" class="cobweb-svg">
            <path d="M0,0 L120,0 M0,0 L0,120 M0,0 L110,40 M0,0 L90,80 M0,0 L60,105 M0,0 L30,118" stroke="rgba(255,255,255,0.22)" stroke-width="1.2" fill="none"/>
            <path d="M30,0 Q26,26 0,30 M55,0 Q48,48 0,55 M85,0 Q72,72 0,85 M115,0 Q98,98 0,115" stroke="rgba(255,255,255,0.28)" stroke-width="1.2" fill="none"/>
            <path d="M20,0 Q18,18 0,20 M42,0 Q36,36 0,42 M70,0 Q60,60 0,70 M100,0 Q86,86 0,100" stroke="rgba(216,180,254,0.35)" stroke-width="1" fill="none"/>
          </svg>
          <div class="spider-thread"></div>
          <div class="hanging-spider" id="hangingSpider" title="🕷️ Happy Halloween! Bấm vào tớ nhé!">
            <svg viewBox="0 0 30 30" width="22" height="22">
              <path d="M10,12 C4,8 2,16 5,20 M11,14 C3,14 2,22 6,24 M19,12 C25,8 27,16 24,20 M18,14 C26,14 27,22 23,24 M10,10 C5,4 1,8 3,12 M19,10 C24,4 28,8 26,12 M11,8 C6,2 3,4 5,8 M18,8 C23,2 26,4 24,8" stroke="#c084fc" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <ellipse cx="14.5" cy="14" rx="5.5" ry="5" fill="#1e1035" stroke="#f97316" stroke-width="1.2"/>
              <ellipse cx="14.5" cy="8.5" rx="3.5" ry="3" fill="#3b0764"/>
              <circle cx="13" cy="8" r="1" fill="#ff4d4f"/>
              <circle cx="16" cy="8" r="1" fill="#ff4d4f"/>
              <circle cx="14.5" cy="14" r="1.5" fill="#fb923c"/>
            </svg>
          </div>
        </div>
        <div class="halloween-cobweb cobweb-right">
          <svg viewBox="0 0 120 120" width="120" height="120" class="cobweb-svg">
            <path d="M120,0 L0,0 M120,0 L120,120 M120,0 L10,40 M120,0 L30,80 M120,0 L60,105 M120,0 L90,118" stroke="rgba(255,255,255,0.22)" stroke-width="1.2" fill="none"/>
            <path d="M90,0 Q94,26 120,30 M65,0 Q72,48 120,55 M35,0 Q48,72 120,85 M5,0 Q22,98 120,115" stroke="rgba(255,255,255,0.28)" stroke-width="1.2" fill="none"/>
            <path d="M100,0 Q102,18 120,20 M78,0 Q84,36 120,42 M50,0 Q60,60 120,70 M20,0 Q34,86 120,100" stroke="rgba(216,180,254,0.35)" stroke-width="1" fill="none"/>
          </svg>
        </div>
      `;
      document.body.prepend(decorWrap);

      const spider = document.getElementById('hangingSpider');
      if (spider) {
        spider.addEventListener('click', function (e) {
          e.stopPropagation();
          spider.classList.add('spooked');
          const rect = spider.getBoundingClientRect();
          createSparkBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
          setTimeout(() => spider.classList.remove('spooked'), 850);
        });
      }
    }

    // 2. Quả bí ngô Jack-o'-lantern trên nút Hỗ trợ
    const supportBtn = document.getElementById('floatingSupportBtn');
    if (supportBtn && !supportBtn.querySelector('.support-halloween-badge')) {
      const pumpkinBadge = document.createElement('span');
      pumpkinBadge.className = 'support-halloween-badge';
      pumpkinBadge.setAttribute('aria-hidden', 'true');
      pumpkinBadge.title = '🎃 Halloween Night 2026!';
      pumpkinBadge.textContent = '🎃';
      supportBtn.appendChild(pumpkinBadge);
    }
  }

    // 3. Quả bí ngô Jack-o'-lantern trên nút Hỗ trợ
    const supportBtn = document.getElementById('floatingSupportBtn');
    if (supportBtn && !supportBtn.querySelector('.support-halloween-badge')) {
      const pumpkinBadge = document.createElement('span');
      pumpkinBadge.className = 'support-halloween-badge';
      pumpkinBadge.setAttribute('aria-hidden', 'true');
      pumpkinBadge.title = '🎃 Halloween Night 2026!';
      pumpkinBadge.textContent = '🎃';
      supportBtn.appendChild(pumpkinBadge);
    }
  }

  // Tiết kiệm pin / CPU: tạm ngưng render khi tab bị ẩn
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    } else {
      if (isHalloweenEnabled && !animId) {
        animId = requestAnimationFrame(update);
      }
    }
  });

  function init() {
    setupCanvas();
    injectDecorations();
    updateToggleButtons();

    document.querySelectorAll('.footer-snow-btn, #toggleSnowBtn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleHalloween();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Tương thích ngược toàn bộ API cũ và mới
  window.TxHalloween = {
    start: function () {
      isHalloweenEnabled = true;
      savePreference();
      start();
      updateToggleButtons();
    },
    stop: function () {
      isHalloweenEnabled = false;
      savePreference();
      stop();
      updateToggleButtons();
    },
    toggle: toggleHalloween
  };

  window.TxSnow = window.TxHalloween;
})();
