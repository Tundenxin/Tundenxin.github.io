# Deploy bằng GitHub Actions và Vercel CLI

Repository vẫn thuộc `Tundenxin/Tundenxin.github.io`. Mỗi push lên `main`
chạy `.github/workflows/vercel.yml`, kiểm tra source, build trên GitHub Actions
và deploy production vào project được chỉ định bởi GitHub Secrets.
Có thể chạy lại bằng **Actions → Deploy to Vercel → Run workflow → main**.
Chạy thủ công trên nhánh khác sẽ bỏ qua job deploy.

Project đã thiết lập cho lần triển khai này: **takeshis-projects-24f593d8/tundenxin-web**,
tài khoản `takeshi75`. Production URL: <https://tundenxin-web.vercel.app>.
Ba secret `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` và `VERCEL_TOKEN` đã được lưu vào repo.
Token được tạo trên Dashboard và lưu riêng; không có token nào trong source.

## 1. Cấu hình của source hiện tại

- Website tĩnh HTML/CSS/JavaScript, không có `package.json` hoặc dependency ứng dụng.
- Framework Preset: **Other**; Root Directory: thư mục gốc repository.
- Install Command: bỏ qua (chuỗi rỗng trong `vercel.json`).
- Build Command: `node scripts/build-static.mjs`.
- Output Directory: `dist`.
- Chưa cần biến môi trường production cho ứng dụng; `.env` hiện đang trống.
- Script build chỉ đóng gói 4 trang HTML và `src/`, giữ nguyên URL và nội dung.
  `.env`, `.git`, tài liệu và workflow không có trong thư mục public.
- Vercel CLI được cố định ở `65.3.1`; Actions được cố định theo commit SHA.
  Khi nâng CLI, đổi cùng phiên bản trong workflow và các lệnh bên dưới, rồi kiểm tra lại.
- Không thêm rewrite SPA hoặc bật `cleanUrls`, vì site dùng các URL `.html` hiện có.

**Điều kiện gói dịch vụ:** Vercel Hobby chỉ dành cho mục đích cá nhân,
phi thương mại. Site hiện có bảng giá và nút mua key, nên có dấu hiệu sử dụng
thương mại; cần xác định tính phù hợp và dùng gói đủ điều kiện nếu cần.
Deploy bằng CLI vẫn chịu giới hạn, chính sách và kiểm tra quyền của Vercel;
đổi tài khoản hoặc bỏ Git Integration không bảo đảm được miễn các kiểm tra này.
Xem [Vercel Hobby](https://vercel.com/docs/plans/hobby) và
[Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines).

## 2. Người B tạo và link project một lần

Chạy trong thư mục repo bằng PowerShell; cần Node.js 24:

```powershell
npx.cmd --yes vercel@65.3.1 login
npx.cmd --yes vercel@65.3.1 whoami
npx.cmd --yes vercel@65.3.1 link
```

Trong phần hỏi đáp của `link`:

1. Chọn đúng scope/account của **người B**.
2. Chọn project đã có của B, hoặc tạo project mới với tên như `tundenxin-web`.
3. Dùng thư mục source hiện tại (`./`), Framework **Other** nếu được hỏi.
4. Nếu CLI đề nghị kết nối Git repository, chọn **No**.

`link` chỉ tạo/liên kết project, chưa deploy production. Kiểm tra project trong
Dashboard của B để chắc chắn đúng owner và Root Directory là gốc repo.
Không cần import GitHub repository qua Git Integration.

Để link lại đúng project đã tạo trong lần thiết lập này:

```powershell
npx.cmd --yes vercel@65.3.1 link --yes --project tundenxin-web --scope takeshis-projects-24f593d8
```

Đọc hai ID (không phải API token):

```powershell
$vercelProject = Get-Content .vercel/project.json -Raw | ConvertFrom-Json
$vercelProject.orgId
$vercelProject.projectId
```

`orgId` có thể là ID team dù giao diện hiển thị tài khoản cá nhân. Dùng đúng
giá trị CLI ghi ra, không thay bằng username/team slug.
Thư mục `.vercel/` bị Git bỏ qua; không commit nó.

## 3. Người B tạo token; người có quyền repo lưu secrets

Người B mở [Vercel Tokens](https://vercel.com/account/tokens), tạo token cho CI
với scope của project B, quyền tối thiểu mà giao diện hỗ trợ và thời hạn phù hợp.
Lưu token trực tiếp trong GitHub Secrets; không đưa vào source, ảnh chụp,
log workflow hoặc tin nhắn chat.

Nếu CLI báo `Cannot create tokens for this app`, dùng trang Tokens ở trên để tạo
thủ công; phiên CLI hiện tại không có quyền cấp token mới. Chọn scope
**TAKESHI's projects** (`takeshis-projects-24f593d8`), không chọn scope Pro khác.
Token có thể giới hạn riêng cho project `tundenxin-web`. Trong CI, workflow dùng
hai biến `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID` để chọn đích, không truyền
`--scope`: cờ này thực hiện lookup tài khoản mà token theo project không có quyền
đọc, dẫn đến lỗi `User not found (404)` dù token vẫn có quyền với project.

Trong repo của A, mở
[Settings → Secrets and variables → Actions](https://github.com/Tundenxin/Tundenxin.github.io/settings/secrets/actions),
chọn **New repository secret** cho mỗi mục:

| Repository secret | Giá trị |
| --- | --- |
| `VERCEL_TOKEN` | API token của người B |
| `VERCEL_ORG_ID` | `orgId` trong `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` trong `.vercel/project.json` |

Workflow dùng **Repository Secrets**, không cần GitHub Environment. Nếu chỉ
lưu secrets trong Environment thì phải sửa job để chọn Environment đó.
Chỉ cấp quyền sửa workflow cho người đáng tin cậy, vì workflow có thể dùng token.
Khi token hết hạn hoặc bị thu hồi, thay `VERCEL_TOKEN` rồi chạy lại workflow.

## 4. Tránh deploy trùng và giữ cấu hình cũ

`vercel.json` đặt `git.deploymentEnabled: false` cho tất cả các nhánh;
deployment bằng CLI vẫn được sử dụng. Không thiết lập Git Integration mới.
Nếu project cũ của A hoặc project của B đang kết nối repository, kiểm tra
**Project Settings → Git** và ngắt kết nối Git ở project không còn cần tự động
deploy. Làm trước lần push kích hoạt đầu tiên để tránh cả hai luồng cùng chạy.
Không xóa project/deployment cũ trong quá trình chuyển đổi.

`CNAME` hiện tại vẫn giữ nguyên `tundenxin.com` cho GitHub Pages. File này
không tự cấu hình domain trên Vercel. Kiểm tra site trên domain `vercel.app`
trước. Nếu cần chuyển domain, thêm domain vào project B tại **Settings → Domains**,
làm bước xác minh ownership và cập nhật DNS theo hướng dẫn Vercel hiển thị.
Domain đang gắn với project A có thể cần chuyển khỏi project A trước;
chỉ chuyển sau khi deployment mới đã được xác nhận hoạt động.

Nếu có biến môi trường ứng dụng trong tương lai, thêm vào project B với target
**Production** trước khi chạy workflow. `vercel pull` tải cấu hình vào `.vercel/`;
`vercel build --prod` tạo artifact trên GitHub Actions, rồi `deploy --prebuilt`
upload artifact đó. Không đưa bí mật vào JavaScript/HTML tĩnh vì người truy cập
có thể đọc toàn bộ các file public.

## 5. Kiểm tra và kích hoạt

Kiểm tra local, không cần đăng nhập Vercel:

```powershell
python scripts/check_links.py
node scripts/build-static.mjs
python -m http.server 8000 --directory dist
```

Mở `http://localhost:8000`, kiểm tra 4 trang, bộ lọc game/tìm kiếm, menu mobile,
modal tải, `guide.html?tool=shika-pc` và nút sao chép link. Dừng server bằng Ctrl+C.

Sau khi tạo đủ secrets và ngừng luồng Git Integration cũ, commit/push cấu hình:

```powershell
git add .github/workflows/vercel.yml .gitignore .vercelignore vercel.json scripts/build-static.mjs DEPLOYMENT.md README.md
git commit -m "ci: deploy static site to Vercel with GitHub Actions"
git push origin main
```

Trong [GitHub Actions](https://github.com/Tundenxin/Tundenxin.github.io/actions):

1. Mở workflow **Deploy to Vercel**, xác nhận các bước kiểm tra, pull, build,
   deploy và kiểm tra HTTP đều thành công. Workflow kiểm tra 4 trang, CSS và
   JavaScript sau mỗi lần deploy. URL production xuất hiện trong **Summary** của run.
2. Đăng nhập Vercel của B: kiểm tra deployment thuộc đúng project, target
   **Production**, và production domain trỏ tới deployment mới.
3. Kiểm tra các chức năng ở trên trên URL production; kiểm tra ảnh, CSS/JS
   không bị 404. Đường dẫn `.env`, `/.git/config`, `/DEPLOYMENT.md` phải trả 404.
4. Lần cập nhật nội dung tiếp theo, A push `main` như bình thường và xác nhận
   run mới tạo deployment production mới.

Workflow chỉ triển khai production, không chạy preview cho pull request. Các run
được xếp hàng để không hủy giữa lúc upload; nếu có nhiều push liên tiếp, GitHub
giữ run đang chạy và thay run đang chờ bằng push mới nhất.

## 6. Xử lý lỗi

- **Missing repository secret:** kiểm tra đúng tên và lưu trong Repository Secrets.
- **Unauthorized / invalid token:** token phải còn hạn, thuộc B và có quyền với
  scope của project; cập nhật secret, không in token để debug.
- **User not found (404) với token theo project:** kiểm tra workflow không truyền
  `--scope` hoặc gọi `whoami`/`link`; dùng hai ID đã lưu để xác định project.
  Lỗi lookup tài khoản không đủ để kết luận token sai. Xem
  [báo cáo trên repository Vercel CLI](https://github.com/vercel/vercel/issues/17506).
- **Project not found / scope mismatch:** đối chiếu cả hai ID từ cùng project B.
- **Git author / quyền truy cập bị từ chối:** kiểm tra quyền và điều kiện gói
  theo lỗi Vercel; không sửa giả tác giả commit hoặc gỡ metadata để né kiểm tra.
- **Build tìm sai thư mục:** Root Directory phải là gốc repo, nơi có `vercel.json`.
- **CLI deploy thành công nhưng domain cũ chưa đổi:** kiểm tra domain đang thuộc
  project nào; `CNAME` trong Git không tự chuyển DNS sang Vercel.
- **URL deployment yêu cầu đăng nhập:** kiểm tra Deployment Protection và dùng
  production domain được cấp quyền truy cập phù hợp để kiểm tra website.
- **Hai deployment cho một commit:** kiểm tra các project Git Integration cũ;
  workflow không tự ngắt kết nối project của tài khoản khác.

Tham khảo chính thức:
[GitHub Actions với Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel),
[Vercel CLI link](https://vercel.com/docs/cli/link),
[Vercel CLI build](https://vercel.com/docs/cli/build).
