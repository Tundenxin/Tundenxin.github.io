/**
 * Tundenxin — Hiệu ứng Bông Tuyết & Tinh Thể Băng Vực Sâu (Cryo / Void Snow)
 * - Canvas phủ toàn màn hình, mượt mà và nhẹ nhàng (60fps)
 * - Kết hợp hạt tuyết mềm phát sáng và tinh thể băng 4 cánh ✦
 * - Tự động dừng hoạt động khi chuyển tab giúp tiết kiệm pin / CPU (Page Visibility API)
 * - Tự động tối ưu số lượng hạt trên điện thoại di động
 * - Tích hợp nút Bật/Tắt ở Footer, lưu tùy chọn vào localStorage
 */

(function () {
  const STORAGE_KEY = 'tundenxin_snow_enabled';
  let isSnowEnabled = localStorage.getItem(STORAGE_KEY) !== 'false'; // Mặc định: Bật

  let canvas, ctx;
  let width = 0, height = 0;
  let particles = [];
  let animId = null;
  const mouse = { x: -1000, y: -1000, lastX: 0, vx: 0 };

  function setupCanvas() {
    if (document.getElementById('snowCanvas')) return;

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

    createParticles();
    if (isSnowEnabled) {
      start();
    } else {
      canvas.style.display = 'none';
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
    const count = isMobile ? 36 : 72;

    for (let i = 0; i < count; i++) {
      particles.push(initParticle(false));
    }
  }

  function initParticle(fromTop) {
    const isStar = Math.random() < 0.24; // ~24% tinh thể sao băng ✦
    const radius = isStar ? Math.random() * 3 + 2.2 : Math.random() * 2.4 + 1;
    return {
      x: Math.random() * width,
      y: fromTop ? -15 - Math.random() * 25 : Math.random() * height,
      radius: radius,
      speedY: Math.random() * 1.1 + 0.55,
      speedX: (Math.random() - 0.5) * 0.45,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: Math.random() * 0.018 + 0.008,
      sway: Math.random() * 1.4 + 0.7,
      opacity: Math.random() * 0.45 + 0.45,
      isStar: isStar,
      color: Math.random() < 0.38 ? '#a5f3fc' : '#ffffff', // Xanh băng Cyan & Trắng tuyết
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.025
    };
  }

  function drawCrystalStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  function update() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.angle += p.angularSpeed;
      p.spin += p.spinSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.angle) * p.sway;

      // Phản ứng gió nhẹ khi chuột lướt qua
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 8100) { // Trong bán kính 90px
        const dist = Math.sqrt(distSq);
        const force = (90 - dist) / 90;
        p.x -= (dx / dist) * force * 1.6;
        p.y -= (dy / dist) * force * 0.6;
      }

      // Khi hạt rơi ra ngoài màn hình, tái tạo lại ở trên đỉnh
      if (p.y > height + 20 || p.x < -30 || p.x > width + 30) {
        particles[i] = initParticle(true);
      }

      // Vẽ hạt tuyết với ánh hào quang mềm
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color === '#a5f3fc' ? 'rgba(56, 189, 248, 0.75)' : 'rgba(255, 255, 255, 0.65)';
      ctx.shadowBlur = p.radius * 2.6;

      if (p.isStar) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        drawCrystalStar(0, 0, 4, p.radius * 1.55, p.radius * 0.45);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    animId = requestAnimationFrame(update);
  }

  function start() {
    if (!animId) {
      animId = requestAnimationFrame(update);
    }
    if (canvas) canvas.style.display = 'block';
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
  }

  function toggleSnow() {
    isSnowEnabled = !isSnowEnabled;
    localStorage.setItem(STORAGE_KEY, isSnowEnabled ? 'true' : 'false');
    if (isSnowEnabled) {
      start();
    } else {
      stop();
    }
    updateToggleButtons();
  }

  function updateToggleButtons() {
    document.querySelectorAll('.footer-snow-btn, #toggleSnowBtn').forEach(btn => {
      btn.innerHTML = isSnowEnabled ? '❄ Tuyết: Bật' : '❄ Tuyết: Tắt';
      btn.classList.toggle('active', isSnowEnabled);
      btn.title = isSnowEnabled ? 'Nhấn để tắt hiệu ứng bông tuyết' : 'Nhấn để bật hiệu ứng bông tuyết';
    });
  }

  // Tiết kiệm pin / CPU: tạm ngưng render khi tab bị ẩn
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    } else {
      if (isSnowEnabled && !animId) {
        animId = requestAnimationFrame(update);
      }
    }
  });

  function init() {
    setupCanvas();
    updateToggleButtons();

    document.querySelectorAll('.footer-snow-btn, #toggleSnowBtn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleSnow();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TxSnow = {
    start: function () {
      isSnowEnabled = true;
      localStorage.setItem(STORAGE_KEY, 'true');
      start();
      updateToggleButtons();
    },
    stop: function () {
      isSnowEnabled = false;
      localStorage.setItem(STORAGE_KEY, 'false');
      stop();
      updateToggleButtons();
    },
    toggle: toggleSnow
  };
})();
