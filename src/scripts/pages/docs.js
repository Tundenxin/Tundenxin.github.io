function setupCopyBtn(btnId, link) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  const originalColor = btn.style.color;
  let feedbackTimer = null;
  btn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        clearTimeout(feedbackTimer);
        btn.innerHTML = '✓ Đã chép link!';
        btn.style.color = '#38bdf8';
        feedbackTimer = setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.style.color = originalColor;
        }, 2000);
      }).catch(() => {
        prompt('Sao chép liên kết:', link);
      });
    } else {
      prompt('Sao chép liên kết:', link);
    }
  });
}
setupCopyBtn('copyShikaBtn', 'https://www.mediafire.com/file/yf14j8shrcxcu4p/Full-Teyvat.zip/file');
setupCopyBtn('copyUnicoreBtn', 'https://www.mediafire.com/file/zah5ffnopw5ltb0/TP-Unicore-Lotus-Shibal_%2528_Tundenxin_%2529.zip/file');
