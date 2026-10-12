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
// Sẵn sàng gắn sự kiện copy link cho các files TP khi được cập nhật lại sau này
