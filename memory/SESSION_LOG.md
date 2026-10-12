# Nhật ký phiên làm việc

## 06/10/2026 — Phiên chuẩn bị hồ sơ
- Yêu cầu: tạo prompt Claude Code, đề xuất thư mục máy tính, hồ sơ, hướng dẫn, bộ nhớ, SOP.
- Kết quả: bộ tài liệu khởi tạo và ảnh tham chiếu. Chưa triển khai website, chưa truy cập máy Windows của người dùng.
- Tiếp theo: mở thư mục dự án trong Claude Code và giao PROMPT_KHOI_TAO.md.

## 06/10/2026 — Phiên triển khai V1
- Mục tiêu: thực hiện PROMPT_KHOI_TAO.md – xây ứng dụng chạy cục bộ, lưu dữ liệu thật, kiểm thử, cập nhật hồ sơ.
- Thay đổi chính: giải nén bộ khởi tạo vào `D:\2026-2027\DUAN_WEDCANHANBEHAI-WORKSPACE\NGOC-MAI-WORKSPACE`; tạo `app/server`, `app/client` (+ `dist`), `tests/`, `KHOI_DONG.bat`, `DUNG.bat`, `package.json`/lockfile.
- Kiểm tra: typecheck + build sạch; `npm test` 14/14 PASS (cả trên máy người dùng – Linux VM); `tests/ui_check.py` 23/23 PASS; khởi động/dừng, đổi cổng khi bận. Báo cáo `reports/2026-10-06_nghiem-thu-v1.md`.
- Quyết định mới: D-007 … D-012.
- Chưa xong: chạy thật trên Windows; nút nhập gói sao lưu qua trình duyệt; đo 15/30 giây.
- Tiếp theo: cô chạy `KHOI_DONG.bat` trên Windows và báo kết quả; tạo bản sao lưu thật đầu tiên.

## 06/10/2026 — Phiên sửa theo phản hồi (chiều)
- Yêu cầu: thay link bằng đường dẫn thư mục; sửa lỗi kết nối máy chủ (ổ D); năm học 2026-2027; đổi tên Ngọc Mai → Võ Văn Bé Hai.
- Bằng chứng lỗi: `data/run/server.json` (pid 47580, 06:42Z) còn lại, CSDL chưa có bản ghi, WAL chưa checkpoint → máy chủ bị dừng đột ngột sau khi mở trang.
- Thay đổi: D-013…D-016; `app/server/src/index.mjs`, `routes/system.mjs` (`/api/system/open-path`), `util.mjs` (nhận đường dẫn), giao diện (SourceLink, thông báo mất kết nối + tự thử lại, Quản lí dữ liệu có nút mở thư mục), `KHOI_DONG.bat`.
- Kiểm tra: `npm test` 15/15 PASS (trên máy người dùng – Linux VM), `tests/ui_check.py` 23/23 PASS. Nút "Mở thư mục" mở File Explorer: CHƯA KIỂM TRA trên Windows.
- Tiếp theo: người dùng chạy lại `KHOI_DONG.bat`, thử "Mở thư mục"; nếu còn lỗi kết nối gửi nội dung `data/run/server.log`.

## 06/10/2026 — Tự chạy cùng Windows
- Yêu cầu: chế độ cục bộ nhớ sẵn link, lần sau không phải bấm nút khởi động.
- Thay đổi: D-017 – `app/scripts/mo-ung-dung.vbs`, `app/scripts/tu-khoi-dong.ps1`, `CAI_TU_KHOI_DONG.bat`, `GO_TU_KHOI_DONG.bat`, `KHOI_DONG.bat` chạy ẩn, API `/api/system/autostart` + bảng “Mở nhanh lần sau” trong Quản lí dữ liệu.
- Kiểm tra: `npm test` 15/15 PASS, `ui_check.py` 23/23 PASS. Tạo lối tắt/tự chạy trên Windows: CHƯA KIỂM TRA (môi trường kiểm tra không có Windows).

## 12/10/2026 — Phiên rà soát và chuẩn hóa
- Mục tiêu: đối chiếu lại tên sản phẩm với đặc tả gốc và kiểm tra build/test trên môi trường Windows hiện tại.
- Thay đổi: chuẩn hóa tên hiển thị về **KHÔNG GIAN LÀM VIỆC NGỌC MAI** ở package, API, tiêu đề trang, header, trang chủ và tài liệu hiện hành; ký hiệu thương hiệu đổi từ BH sang NM.
- Kiểm tra: `npm install --ignore-scripts`, `npm run typecheck`, `npm run build`, `npm test`; kết quả chi tiết ghi tại `memory/STATE.md`.
- Còn lại: một kiểm thử khởi động lần hai trên Windows trả mã `0xC0000409`; cần xác nhận bằng cửa sổ máy chủ thực tế trước khi kết luận lỗi môi trường hay lỗi mã.

## Mẫu ghi cuối mỗi phiên
- Ngày/giờ, mục tiêu phiên:
- Thay đổi chính và đường dẫn:
- Kiểm tra đã chạy, kết quả và báo cáo:
- Quyết định mới:
- Việc chưa xong, lỗi, điểm chưa xác nhận:
- Bước tiếp theo:

Không lưu toàn bộ hội thoại; chỉ lưu thông tin giúp phiên sau tiếp tục chính xác.
