function setupCopyBtn(btnId, link, feedbackText = '✓ Đã chép link!') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  const originalColor = btn.style.color;
  let feedbackTimer = null;
  btn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        clearTimeout(feedbackTimer);
        btn.innerHTML = feedbackText;
        btn.style.color = '#38bdf8';
        feedbackTimer = setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.style.color = originalColor;
        }, 2000);
      }).catch(() => {
        prompt('Sao chép:', link);
      });
    } else {
      prompt('Sao chép:', link);
    }
  });
}
function initDocsCopy() {
  setupCopyBtn('copyShikaBtn', 'https://gofile.io/d/2tPMUx67');
  setupCopyBtn('copyUnicoreBtn', 'https://gofile.io/d/uCpNZVbJ');
  setupCopyBtn('copyDmshbyBtn', 'https://gofile.io/d/LFsW9PZA');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocsCopy);
} else {
  initDocsCopy();
}
