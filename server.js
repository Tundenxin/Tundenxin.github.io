const config = require('./server/config');
const { initDb } = require('./server/db');
const { ensureSampleFiles } = require('./server/files-service');
const telegramService = require('./server/telegram-service');
const { createServer } = require('./server/app');

async function main() {
  console.log('Khởi tạo hệ thống Tundenxin Gatekeeper...');

  // 1. Khởi tạo Cơ sở dữ liệu SQLite
  initDb();

  // 2. Chuẩn bị thư mục và tệp mẫu được bảo vệ
  ensureSampleFiles();

  // 3. Hiển thị thông tin kiểm tra cấu hình
  config.validate();

  // 4. Khởi động Long Polling cho Bot Telegram (nếu đã cấu hình token)
  if (config.telegram.isConfigured) {
    telegramService.startPolling().catch(err => {
      console.error('[Telegram Start Error]:', err);
    });
  } else {
    console.log('💡 Gợi ý: Để bật xác minh Telegram, hãy điền token bot vào file .env.');
  }

  // 5. Khởi động HTTP Server
  const server = createServer();

  server.listen(config.port, config.host, () => {
    console.log(`🚀 Website & Backend đang chạy tại: http://localhost:${config.port}`);
    console.log(`   (Mở trình duyệt truy cập http://localhost:${config.port} để trải nghiệm)`);
  });

  // Xử lý tắt ứng dụng an toàn
  const shutdown = () => {
    console.log('\nĐang dừng hệ thống an toàn...');
    telegramService.stopPolling();
    server.close(() => {
      console.log('Đã đóng kết nối HTTP Server. Hoàn tất.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Lỗi khởi động server:', err);
  process.exit(1);
});
