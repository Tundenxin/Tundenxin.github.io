function setupCopyBtn(btnId, link) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        const oldText = btn.innerHTML;
        btn.innerHTML = '✓ Đã chép link!';
        btn.style.color = '#38bdf8';
        setTimeout(() => {
          btn.innerHTML = oldText;
          btn.style.color = '';
        }, 2000);
      }).catch(() => {
        prompt('Sao chép liên kết:', link);
      });
    } else {
      prompt('Sao chép liên kết:', link);
    }
  });
}

setupCopyBtn('copyShikaBtn', 'https://mega.nz/file/OyIhxDaa#fmGdrM2K48qIpw1-ayGRuUh3HzITLWwcxtWRGlOY0BI');
setupCopyBtn('copyUnicoreBtn', 'https://mega.nz/file/36AEEbpC#fOe7rcsC7C8l338Haj-isYo_s0KG1WNTZIfvunbG4dk');
