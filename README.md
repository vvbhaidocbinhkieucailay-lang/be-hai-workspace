# NGOC MAI WORKSPACE — Bộ khởi tạo dự án

Ngày lập: 06/10/2026 · Phiên bản tài liệu: 1.0 · Ngôn ngữ: tiếng Việt.

## Trạng thái thực tế
Cập nhật 06/10/2026: **V1 đã xây** (máy chủ Node + SQLite, giao diện React build sẵn) và đạt kiểm thử kỹ thuật (xem `reports/2026-10-06_nghiem-thu-v1.md`). **Chưa chạy thử trên Windows thật.** Chưa có dữ liệu cá nhân thật; thư mục `data/` được tạo ở lần chạy đầu.

Chạy nhanh: cài Node.js LTS (≥ 22.13) → nháy đúp `KHOI_DONG.bat` → trình duyệt mở `http://127.0.0.1:5178/`. Dừng: `DUNG.bat` hoặc Ctrl+C. Chi tiết: `docs/HUONG_DAN_SU_DUNG.md`.

## Mã nguồn công khai và link mở ứng dụng

- Mã nguồn công khai: https://github.com/vvbhaidocbinhkieucailay-lang/be-hai-workspace
- Mở bản đầy đủ trên máy: http://127.0.0.1:5178/ sau khi chạy `KHOI_DONG.bat`.
- GitHub Pages không được bật cho ứng dụng này vì Pages chỉ phục vụ tệp tĩnh, trong khi V1 cần máy chủ Node.js, SQLite, upload tệp và sao lưu. Không dùng một trang Pages giả vì sẽ làm giao diện báo lỗi API và có thể gây hiểu nhầm rằng dữ liệu đã được lưu.
- Muốn có URL Internet đầy đủ cần triển khai máy chủ Node.js và cơ sở dữ liệu riêng (kèm chính sách bảo vệ dữ liệu); không đưa `data/`, tệp cá nhân hoặc bản sao lưu lên GitHub.

## Bắt đầu trên Windows
1. Giải nén thư mục `NGOC-MAI-WORKSPACE` vào `D:\DU_AN_CA_NHAN\` nếu máy có ổ D.
2. Nếu không có ổ D, dùng thư mục Documents của tài khoản Windows hiện tại, ví dụ `C:\Users\<ten-tai-khoan>\Documents\DU_AN_CA_NHAN\NGOC-MAI-WORKSPACE`. Không nhập nguyên văn phần `<ten-tai-khoan>`.
3. Mở đúng thư mục gốc dự án trong môi trường làm việc của Claude Code đã cài đặt. Không mở toàn bộ ổ đĩa.
4. Mở `PROMPT_KHOI_TAO.md`, sao chép toàn bộ nội dung và gửi Claude Code. Không cần chạy `/init` để thay bộ hướng dẫn đã có.
5. Claude Code kiểm tra môi trường, đọc hồ sơ, tạo mã nguồn, chạy kiểm tra và ghi hướng dẫn khởi động thực tế vào `docs/HUONG_DAN_SU_DUNG.md`.
6. Sau này mở lại đúng dự án và dùng `prompts/TIEP_TUC.md`.

## Sơ đồ thư mục dự kiến
| Đường dẫn | Vai trò | Hiện trạng trong bộ này |
|---|---|---|
| `CLAUDE.md` | Chỉ dẫn làm việc cho Claude Code | Có |
| `PROMPT_KHOI_TAO.md` | Yêu cầu triển khai đầy đủ | Có |
| `docs/` | Hồ sơ, yêu cầu, kiến trúc, thiết kế, nghiệm thu, hướng dẫn | Có |
| `memory/` | Trạng thái, quyết định, nhật ký các phiên | Có |
| `sop/` | Quy trình phát triển, tài liệu, sao lưu, bàn giao | Có |
| `prompts/` | Prompt tiếp tục và kết thúc phiên | Có |
| `KHOI_DONG.bat`, `DUNG.bat` | Mở/dừng ứng dụng trên Windows | Đã tạo; chưa chạy thử trên Windows |
| `package.json`, `package-lock.json` | Lệnh npm và phiên bản phụ thuộc phát triển | Đã tạo |
| `references/` | Ảnh giao diện tham chiếu | Có |
| `app/` | Giao diện và máy chủ cục bộ | Đã tạo: `app/server` (API + SQLite), `app/client` (+ `dist` build sẵn) |
| `tests/` | Kiểm thử luồng quan trọng | `api.test.mjs` (14 test), `ui_check.py` (trình duyệt) |
| `data/` | SQLite, tệp gốc, bản nhập, bản xuất | Tạo khi chạy lần đầu; chưa có dữ liệu thật |
| `backups/` | Bản sao dữ liệu theo thời điểm | Có hướng dẫn; chưa có bản sao |
| `reports/` | Báo cáo kiểm tra, ảnh chụp, bàn giao | `2026-10-06_nghiem-thu-v1.md`, ảnh `2026-10-06_anh/` |

## Các giới hạn đã chọn
- V1 dùng trên một máy, truy cập qua localhost; không công khai website.
- Dữ liệu chính lưu trong thư mục `data/`; không dùng localStorage làm kho dữ liệu chính.
- Email nhập thủ công; không kết nối hộp thư hoặc gửi thư.
- Chưa đồng bộ điện thoại, chưa thông báo khi ứng dụng đóng.
- Ngày bảo vệ mới xác định ngày/tháng 25/10; năm, giờ, địa điểm chưa xác nhận.
- Tài liệu nội bộ có thể được Claude Code đọc khi được cấp quyền: chỉ đưa tài liệu cần thiết vào phạm vi dự án; không đặt mật khẩu/token trong hồ sơ hay bộ nhớ.

## Bốn câu phân biệt
`CLAUDE.md` là quy tắc làm việc; `memory/STATE.md` là trạng thái hiện tại; `docs/HO_SO_DU_AN.md` là phạm vi và mục tiêu; `data/` là dữ liệu ứng dụng. Bộ nhớ dự án không thay thế sao lưu dữ liệu.

> Tên hiển thị chính thức của ứng dụng là **KHÔNG GIAN LÀM VIỆC BÉ HAI**; thư mục dự án kỹ thuật vẫn là `NGOC-MAI-WORKSPACE`. Năm học mặc định 2026-2027. Trường nguồn nhận đường dẫn thư mục trên máy (vd. `D:\2026-2027\Giao an`).
