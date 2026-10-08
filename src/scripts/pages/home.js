// Modal chọn nhóm Telegram / Discord & đếm ngược 120s mở khóa link tải Tool Mobile (hỗ trợ nhập Key tundenxin để tải luôn)
(function () {
  const overlay = document.getElementById('txDownloadModalOverlay');
  const closeBtn = document.getElementById('txDlModalCloseBtn');
  const toolNameSpan = document.getElementById('dlModalToolName');
  const serverCards = document.querySelectorAll('.js-dl-server-card');
  const pillTelegram = document.getElementById('txPillTelegram');
  const pillDiscord = document.getElementById('txPillDiscord');
  const statusIcon = document.getElementById('txDlStatusIcon');
  const statusTitle = document.getElementById('txDlStatusTitle');
  const statusSub = document.getElementById('txDlStatusSub');
  const progressBar = document.getElementById('txDlProgressBar');
  const finalBtn = document.getElementById('txDlFinalBtn');
  const btnIcon = document.getElementById('txDlBtnIcon');
  const btnText = document.getElementById('txDlBtnText');
  const btnTimer = document.getElementById('txDlBtnTimer');
  const keyInput = document.getElementById('txDlKeyInput');
  const keySubmitBtn = document.getElementById('txDlKeySubmitBtn');
  const keyMsg = document.getElementById('txDlKeyMsg');

  if (!overlay) return;

  let currentToolName = 'Tool Mobile';
  let currentToolUrl = '#';
  let countdownTimer = null;
  let isUnlocked = false;

  function resetModalState() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    isUnlocked = false;

    // Reset server cards
    serverCards.forEach(c => c.classList.remove('selected'));
    if (pillTelegram) pillTelegram.textContent = 'Bấm để tham gia ↗';
    if (pillDiscord) pillDiscord.textContent = 'Bấm để tham gia ↗';

    // Reset key input
    if (keyInput) {
      keyInput.value = '';
      keyInput.disabled = false;
    }
    if (keySubmitBtn) {
      keySubmitBtn.textContent = 'Xác Nhận';
      keySubmitBtn.disabled = false;
    }
    if (keyMsg) {
      keyMsg.hidden = true;
      keyMsg.textContent = '';
      keyMsg.className = 'tx-dl-key-msg';
    }

    // Reset status & progress
    if (statusIcon) statusIcon.textContent = '🔒';
    if (statusTitle) statusTitle.textContent = 'Chưa tham gia máy chủ';
    if (statusSub) statusSub.textContent = 'Bấm Telegram hoặc Discord ở trên để đếm ngược 120 giây (hoặc nhập Key để tải luôn).';
    if (progressBar) progressBar.style.width = '0%';

    // Reset button
    if (finalBtn) {
      finalBtn.className = 'tx-dl-final-btn is-locked';
      finalBtn.setAttribute('aria-disabled', 'true');
      finalBtn.href = '#';
    }
    if (btnIcon) btnIcon.textContent = '🔒';
    if (btnText) btnText.textContent = 'Chờ tham gia 1 trong 2 máy chủ...';
    if (btnTimer) {
      btnTimer.style.display = 'none';
      btnTimer.textContent = '120s';
    }
  }

  function openModal(toolName, toolUrl) {
    currentToolName = toolName || 'Tool Mobile';
    currentToolUrl = toolUrl || '#';
    if (toolNameSpan) {
      toolNameSpan.textContent = currentToolName;
    }
    resetModalState();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function triggerUnlock() {
    isUnlocked = true;
    if (statusIcon) statusIcon.textContent = '✅';
    if (statusTitle) statusTitle.textContent = 'Xác nhận thành công! Link tải đã mở khóa';
    if (statusSub) statusSub.textContent = 'Bấm vào nút xanh bên dưới để tải trực tiếp file về máy.';
    if (progressBar) progressBar.style.width = '100%';

    if (finalBtn) {
      finalBtn.className = 'tx-dl-final-btn is-ready';
      finalBtn.removeAttribute('aria-disabled');
      finalBtn.href = currentToolUrl;
    }
    if (btnIcon) btnIcon.textContent = '📥';
    if (btnText) btnText.textContent = 'TẢI XUỐNG NGAY (' + currentToolName + ')';
    if (btnTimer) btnTimer.style.display = 'none';
  }

  function handleKeySubmit() {
    if (!keyInput || isUnlocked) return;
    const val = (keyInput.value || '').trim().toLowerCase();
    if (val === 'tundenxin') {
      if (keySubmitBtn) {
        keySubmitBtn.textContent = 'Đang xử lý...';
        keySubmitBtn.disabled = true;
      }
      if (keyInput) keyInput.disabled = true;

      if (keyMsg) {
        keyMsg.className = 'tx-dl-key-msg success';
        keyMsg.textContent = '✅ Key chính xác! Đang mở khóa sau 3 giây...';
        keyMsg.hidden = false;
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }

      let waitSeconds = 3;
      if (statusIcon) statusIcon.textContent = '⏳';
      if (statusTitle) statusTitle.textContent = 'Xác nhận thành công! Đang xử lý...';
      if (statusSub) statusSub.textContent = 'Vui lòng đợi 3 giây để hệ thống tạo nút tải ngay.';

      if (finalBtn) {
        finalBtn.className = 'tx-dl-final-btn is-counting';
      }
      if (btnIcon) btnIcon.textContent = '⏳';
      if (btnText) btnText.textContent = 'Mở khóa tải ngay sau:';
      if (btnTimer) {
        btnTimer.style.display = 'inline-block';
        btnTimer.textContent = waitSeconds + 's';
      }
      if (progressBar) {
        progressBar.style.width = '30%';
      }

      const keyWaitTimer = setInterval(() => {
        waitSeconds--;
        if (progressBar) {
          progressBar.style.width = ((3 - waitSeconds) / 3 * 100) + '%';
        }
        if (btnTimer) {
          btnTimer.textContent = waitSeconds + 's';
        }
        if (statusSub) {
          statusSub.textContent = 'Sẵn sàng tải xuống trong ' + waitSeconds + ' giây...';
        }

        if (waitSeconds <= 0) {
          clearInterval(keyWaitTimer);
          triggerUnlock();
          if (keySubmitBtn) {
            keySubmitBtn.textContent = 'Đã Xác Nhận ✓';
            keySubmitBtn.disabled = false;
          }
          if (keyInput) keyInput.disabled = false;
          if (keyMsg) {
            keyMsg.textContent = '✅ Key chính xác! Nút tải ngay đã xuất hiện bên dưới.';
          }
        }
      }, 1000);

    } else {
      if (keyMsg) {
        keyMsg.className = 'tx-dl-key-msg error';
        keyMsg.textContent = '❌ Key không chính xác! Vui lòng thử lại hoặc chờ đếm ngược 120s.';
        keyMsg.hidden = false;
      }
      keyInput.focus();
    }
  }

  if (keySubmitBtn) {
    keySubmitBtn.addEventListener('click', handleKeySubmit);
  }
  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeySubmit();
      }
    });
  }

  // Phím tắt bí mật: gõ trực tiếp 'tundenxin' trên bàn phím khi mở modal sẽ tự động mở khóa tải luôn sau 3s
  let secretKeyBuffer = '';
  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active') || isUnlocked) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== keyInput) return;
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      secretKeyBuffer += e.key.toLowerCase();
      if (secretKeyBuffer.length > 25) {
        secretKeyBuffer = secretKeyBuffer.slice(-25);
      }
      if (secretKeyBuffer.endsWith('tundenxin')) {
        secretKeyBuffer = '';
        if (keyInput) keyInput.value = 'tundenxin';
        handleKeySubmit();
      }
    }
  });

  function startCountdown() {
    if (isUnlocked || countdownTimer) return;

    let secondsLeft = 120;
    if (statusIcon) statusIcon.textContent = '⏳';
    if (statusTitle) statusTitle.textContent = 'Đang xác thực máy chủ...';
    if (statusSub) statusSub.textContent = 'Vui lòng đợi 120 giây để hệ thống mở khóa (hoặc nhập Key để tải luôn).';

    if (finalBtn) {
      finalBtn.className = 'tx-dl-final-btn is-counting';
    }
    if (btnIcon) btnIcon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Đang mở khóa sau:';
    if (btnTimer) {
      btnTimer.style.display = 'inline-block';
      btnTimer.textContent = secondsLeft + 's';
    }
    if (progressBar) {
      progressBar.style.width = '2%';
    }

    countdownTimer = setInterval(() => {
      secondsLeft--;
      if (progressBar) {
        progressBar.style.width = ((120 - secondsLeft) / 120 * 100) + '%';
      }
      if (btnTimer) {
        btnTimer.textContent = secondsLeft + 's';
      }
      if (statusSub) {
        statusSub.textContent = 'Còn ' + secondsLeft + ' giây... (hoặc nhập Key ở trên để tải luôn)';
      }

      if (secondsLeft <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        triggerUnlock();
      }
    }, 1000);
  }

  // Khi người dùng bấm tham gia 1 trong 2 máy chủ
  serverCards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.add('selected');
      const pill = card.querySelector('.tx-dl-check-pill');
      if (pill) pill.textContent = '✓ Đã chọn';
      startCountdown();
    });
  });

  // Bắt sự kiện click các nút TẢI NGAY trên trang chính
  document.querySelectorAll('.js-mobile-dl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const toolName = btn.dataset.toolName || 'Tool Mobile';
      const toolUrl = btn.dataset.toolUrl || '#';
      openModal(toolName, toolUrl);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeModal();
    }
  });
      // ==========================================
  // BỘ LỌC TỪNG GAME & TÌM KIẾM TOOL WIBUZSTORE
  // ==========================================
  (function initGameCatalog() {
    const gameTabs = document.querySelectorAll(".game-tab-btn");
    const gameSections = document.querySelectorAll(".game-group-section");
    const searchInput = document.getElementById("shopToolSearchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    const noResults = document.getElementById("shopNoResults");

    let activeGame = "all";

    function filterShopTools() {
      const query = (searchInput ? searchInput.value : "").toLowerCase().trim();
      if (clearBtn) clearBtn.hidden = !query;

      let totalVisibleCards = 0;

      gameSections.forEach(section => {
        const sectionGameKey = section.dataset.gameKey;
        const matchesGameTab = (activeGame === "all" || activeGame === sectionGameKey);

        const cards = section.querySelectorAll(".tool-card");
        let visibleInThisSection = 0;

        cards.forEach(card => {
          const toolName = (card.dataset.toolName || "").toLowerCase();
          const titleEl = card.querySelector("h3");
          const titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
          const copyEl = card.querySelector(".tool-copy");
          const copyText = copyEl ? copyEl.textContent.toLowerCase() : "";

          const matchesSearch = !query || 
            toolName.includes(query) || 
            titleText.includes(query) || 
            copyText.includes(query) || 
            sectionGameKey.includes(query);

          if (matchesGameTab && matchesSearch) {
            card.classList.remove("is-hidden");
            visibleInThisSection++;
            totalVisibleCards++;
          } else {
            card.classList.add("is-hidden");
          }
        });

        if (matchesGameTab && visibleInThisSection > 0) {
          section.classList.remove("is-hidden");
        } else {
          section.classList.add("is-hidden");
        }
      });

      if (noResults) {
        noResults.hidden = (totalVisibleCards > 0);
      }
    }

    gameTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        gameTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeGame = btn.dataset.filterGame || "all";
        filterShopTools();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", filterShopTools);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        filterShopTools();
        searchInput.focus();
      });
    }
  })();
})();
