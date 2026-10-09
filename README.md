# Tundenxin — Genshin Mobile Free (Skirk / Void Realm Theme)

Website tĩnh dùng HTML, CSS và JavaScript thuần, không cần bước build.

## Cấu trúc source

```text
.
├── index.html                 # Trang chủ, danh sách tool và nút tải
├── tools.html                 # Công cụ hỗ trợ
├── guide.html                 # Hướng dẫn theo từng tool
├── docs.html                  # File TP và tài nguyên
├── src/
│   ├── styles/
│   │   └── style.css          # CSS chung và responsive
│   ├── scripts/
│   │   ├── shared/
│   │   │   ├── nav.js         # Menu di động
│   │   │   ├── notice.js      # Thông báo trang chủ
│   │   │   └── snow.js        # Hiệu ứng tuyết
│   │   └── pages/
│   │       ├── home.js        # Bộ lọc game và modal tải tool
│   │       ├── tools.js       # Tìm kiếm và lọc công cụ
│   │       ├── guide.js       # Panel hướng dẫn và liên kết ?tool=
│   │       └── docs.js        # Sao chép liên kết tải
│   └── assets/images/
│       ├── backgrounds/       # Ảnh nền desktop và mobile
│       ├── games/             # Icon các game
│       ├── guides/            # Ảnh minh họa hướng dẫn
│       ├── icons/             # Favicon và icon giao diện
│       └── tools/             # Ảnh các tool
└── scripts/
    └── check_links.py         # Kiểm tra đường dẫn nội bộ
```

Bốn trang HTML được giữ ở thư mục gốc để các URL cũ như
`guide.html?tool=shika-pc`, `index.html#tools` tiếp tục hoạt động.
Các script của từng trang được tải bằng `defer`. Đoạn khởi tạo Vercel
Analytics ngắn vẫn nằm trong `<head>` của mỗi trang.

## Chạy trên máy

Từ thư mục gốc của repo:

```sh
python -m http.server 8000
```

Mở `http://localhost:8000`. Khi deploy website tĩnh, thư mục được phục vụ
là thư mục gốc repo, gồm cả các trang HTML và `src/`.

## Quy tắc đường dẫn

- HTML dùng đường dẫn tương đối từ thư mục gốc, ví dụ
  `src/assets/images/tools/tool-shika.png`.
- `url(...)` trong CSS tính từ thư mục chứa CSS, ví dụ
  `../assets/images/backgrounds/skirk-bg.jpg`.
- Đường dẫn gán vào `img.src` trong JavaScript hoặc `onerror` tính từ URL
  trang HTML, không tính từ thư mục chứa JavaScript.
- Giữ nguyên tên file và chữ hoa/thường. Ảnh dự phòng phải tắt `onerror`
  trước khi đổi `src` để không tải lặp khi ảnh dự phòng cũng lỗi.
- `/_vercel/insights/script.js` do Vercel cung cấp khi bật Web Analytics;
  đây không phải file nằm trong repo.

Sau khi thêm hoặc di chuyển file, kiểm tra bằng:

```sh
python scripts/check_links.py
```

Lệnh kiểm tra các đường dẫn trong HTML, CSS, chuỗi URL trong JavaScript,
ảnh dự phòng và anchor nội bộ. Liên kết tới dịch vụ bên ngoài không được
kiểm tra mạng.
