# Protected Files Directory (Kho tệp được bảo vệ)

Thư mục này chứa các tệp tải về thực tế của website Tundenxin:
- `KURO-v2.2.2h.apk`: Bản cài đặt Tool Kuro Genshin Mobile.
- `DMSHBY.sh`: Script Genshin Mobile DMSHBY.
- `Yukino.apk`: Bản cài đặt Tool Yukino Genshin Mobile.
- `Eleutheria.apk`: Bản cài đặt Tool Eleutheria Genshin Mobile.

### Cơ chế bảo vệ:
- Các file trong thư mục này **KHÔNG** thể truy cập trực tiếp qua URL tĩnh (đã được backend `app.js` chặn hoàn toàn).
- Người dùng chỉ có thể tải được tệp khi:
  1. Đã xác minh là thành viên hợp lệ của nhóm Telegram hoặc server Discord.
  2. Được cấp mã `download_token` dùng một lần (single-use), có thời hạn ngắn (5 phút).
  3. Hệ thống kiểm tra lại tư cách thành viên ngay trước khi bắt đầu stream dữ liệu.
