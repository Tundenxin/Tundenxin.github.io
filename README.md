# Tundenxin — Genshin Mobile Free (Gatekeeper System)

Website tổng hợp Tool Genshin Impact Mobile phong cách **Vực Sâu & nhân vật Skirk (Liquid Glass Theme)**, tích hợp hệ thống **Gatekeeper xác minh thành viên Telegram / Discord** trước khi mở khóa tải file.

---

## ⚡ Tính năng nổi bật

1. **Gatekeeper Xác minh thành viên thực tế**:
   - Khi người dùng bấm **TẢI NGAY**, hệ thống yêu cầu xác minh tư cách thành viên của **Nhóm Telegram** hoặc **Server Discord**.
   - Phân biệt rõ người đã là thành viên (mở khóa ngay) và người chưa tham gia (cấp link mời, tự động duyệt yêu cầu).
   - Tuyệt đối không cho phép bấm link ảo, chia sẻ link hay gửi request giả mạo để bypass tải file.
2. **Bảo mật tệp tin phía Backend**:
   - Tệp thực tế (`Kuro.apk`, `DMSHBY.sh`, `Yukino.apk`, `Eleutheria.apk`) nằm trong thư mục bảo vệ `protected_files/`, không có URL tĩnh công khai.
   - Cấp mã `download_token` ngắn hạn (5 phút), dùng 1 lần (single-use) gắn chặt với phiên khách.
   - Kiểm tra lại tư cách thành viên (re-check membership) ngay trước khi bắt đầu stream file.
3. **Zero External Dependencies**:
   - Chạy trực tiếp bằng **Node.js v24** với các module có sẵn (`node:http`, `node:sqlite DatabaseSync`, `node:crypto`, `fetch`).
   - Không cần cài `npm install` hay build C++ native trên Windows.

---

## 🚀 Hướng dẫn Chạy Local (Nhanh nhất)

### Bước 1: Khởi động Server
Mở terminal trong thư mục dự án và chạy lệnh:
```bash
node server.js
```
Hoặc qua npm script:
```bash
npm start
```
Hệ thống sẽ chạy tại địa chỉ: **`http://localhost:3000`**.

---

## 🤖 Hướng dẫn Thiết lập Telegram Bot

Để hệ thống tự động xác minh thành viên Telegram:

1. **Tạo Bot Telegram**:
   - Mở ứng dụng Telegram, tìm đến bot `@BotFather`.
   - Gửi lệnh `/newbot`, nhập tên bot và username kết thúc bằng `bot` (ví dụ: `TundenxinVerifyBot`).
   - `@BotFather` sẽ gửi cho bạn **API Token** (dạng `1234567890:ABCdef...`).
2. **Thêm Bot vào Nhóm Telegram**:
   - Mời Bot vừa tạo vào Nhóm Telegram của bạn (`@BoxToolGS_VN`).
   - Thăng cấp cho Bot làm **Administrator (Quản trị viên)** với quyền:
     - `Invite Users via Link` (Tạo liên kết mời).
     - `Manage Chat` (hoặc các quyền quản trị cơ bản).
3. **Lấy Chat ID của nhóm**:
   - Thêm bot `@userinfobot` hoặc `@raw_data_bot` vào nhóm để xem ID (thường có tiền tố `-100...`, ví dụ: `-1002345678901`).
4. **Cấu hình vào file `.env`**:
   Mở file `.env` và điền:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
   TELEGRAM_BOT_USERNAME=TundenxinVerifyBot
   TELEGRAM_CHAT_ID=-1002345678901
   TELEGRAM_GROUP_LINK=https://t.me/BoxToolGS_VN
   ```
5. **Khởi động lại server**:
   Chạy lại `node server.js`. Bot sẽ tự động chạy chế độ Long Polling local và sẵn sàng phục vụ.

---

## 🎮 Hướng dẫn Thiết lập Discord (Tùy chọn)

Nếu muốn kích hoạt thêm nền tảng Discord:

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Tạo **New Application** → Tab **OAuth2** → Thêm Redirect URI:
   `http://localhost:3000/auth/discord/callback`
3. Lấy `Client ID` và `Client Secret`.
4. Tab **Bot** → Tạo Bot và lấy `Bot Token`. Mời Bot vào Server Discord của bạn.
5. Điền vào file `.env`:
   ```env
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_GUILD_ID=your_server_id
   DISCORD_SERVER_LINK=https://discord.gg/xa83TbAw6n
   ```
*(Lưu ý: Nếu chưa cấu hình Discord, hệ thống vẫn hoạt động 100% bình thường với Telegram).*

---

## 🧪 Chạy Bộ Kiểm thử Tự Động

Kiểm tra toàn bộ logic State Machine, Token, Session và Quyền bảo mật:
```bash
npm test
```
Hoặc:
```bash
node tests/test-verification.js
node tests/test-http-api.js
```
Tất cả các bài kiểm tra đều chạy in-memory độc lập, không cần kết nối internet bên ngoài.

---

## 📁 Cấu trúc Thư mục

```
d:\Tundenxin.github.io\
├── server.js                  # Điểm khởi chạy chính của ứng dụng
├── server\
│   ├── config.js              # Nạp biến môi trường & kiểm tra cấu hình
│   ├── db.js                  # Cơ sở dữ liệu SQLite (node:sqlite DatabaseSync)
│   ├── session.js             # Quản lý phiên khách an toàn qua HttpOnly Cookie
│   ├── files-service.js       # Quản lý file bảo vệ, cấp & tiêu thụ download token
│   ├── telegram-service.js    # Telegram Bot Long Polling, Deep Link, Join Request
│   ├── discord-service.js     # Discord OAuth2 & kiểm tra Guild Membership
│   ├── verification.js        # State Machine quản lý phiên xác minh
│   └── app.js                 # HTTP Router & Controller phục vụ API & Static Files
├── protected_files\           # Kho lưu trữ tệp tin thực tế được bảo vệ
├── verify-modal.js            # Module giao diện modal xác minh phía Frontend
├── verify-modal.css           # Bộ CSS Liquid Glass cho modal xác minh
├── tests\                     # Các bộ kiểm thử tự động toàn diện
├── index.html                 # Trang chủ hiển thị các Tool Genshin
├── style.css                  # Giao diện chính của website
└── .env                       # File cấu hình biến môi trường (token bot, chat id...)
```
