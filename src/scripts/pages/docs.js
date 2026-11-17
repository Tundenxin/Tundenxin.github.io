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
  setupCopyBtn('copyShikaBtn', 'https://www.mediafire.com/file/agltz9ar19zb9rs/Shika-Tundenxin.zip/file');
  setupCopyBtn('copyUnicoreBtn', 'https://www.mediafire.com/file/h1pqgd4skv5nd67/Unicore-Lotus-Shibal.zip/file');
  setupCopyBtn('copyDmshbyBtn', 'https://www.mediafire.com/file/45jkc9yokxtia5f/Dmshby-tundenxin.zip/file');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocsCopy);
} else {
  initDocsCopy();
}
