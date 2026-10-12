# Kiến trúc V1 đề xuất

## Quyết định nền tảng
V1 là web có máy chủ cục bộ: giao diện React/TypeScript/Vite, API Node.js và SQLite. Đây là đề xuất để Claude Code triển khai, chưa phải stack đã cài. Nếu thư mục đã có nền tảng phù hợp, đánh giá tái sử dụng trước khi thay.

Browser → API cục bộ → SQLite + kho tệp. Bản sản phẩm phục vụ UI/API cùng origin tại 127.0.0.1; chế độ dev dùng proxy cục bộ. Không dùng file:// để chạy UI. Không dùng localStorage làm nguồn dữ liệu chính.

## Thư mục mã nguồn cần tạo
| Đường dẫn | Nội dung |
|---|---|
| `app/client/src/pages/` | Trang và màn hình sáu phân hệ |
| `app/client/src/components/` | Thành phần dùng chung |
| `app/client/src/features/` | Logic giao diện theo chức năng |
| `app/client/src/styles/` | Màu, chữ, responsive |
| `app/server/src/` | API, validation, xử lí tệp, dịch vụ |
| `app/server/migrations/` | Thay đổi schema có phiên bản |
| `app/shared/` | Kiểu dữ liệu/schema chung nếu hữu ích |
| `tests/` | Kiểm thử API, dữ liệu và luồng trình duyệt |
| `data/db/` | Cơ sở dữ liệu thật |
| `data/files/` | Tệp đính kèm thật |
| `data/imports/`, `data/exports/` | Nhập/xuất do người dùng thực hiện |
| `backups/` | Bản sao có manifest |
| `reports/` | Bằng chứng kiểm tra và bàn giao |

## Quy tắc kỹ thuật
- Claude Code kiểm tra Node và thư viện hiện hành từ tài liệu chính thức; chọn bộ tương thích, ghi phiên bản và lockfile. Không tự nâng cấp toàn bộ môi trường máy.
- Có một cách khởi động từ thư mục gốc được kiểm tra trên Windows. Lệnh thật chỉ ghi vào hướng dẫn sau khi chạy.
- Đường dẫn data được xác định từ gốc dự án bằng cơ chế portable, không hardcode ổ D.
- SQLite bật ràng buộc khóa ngoại; migration có version; transaction cho cập nhật nhiều bảng; không chạy hai dịch vụ ghi khác nhau trên cùng data.
- File upload lưu tên nội bộ theo ID; tên gốc chỉ là metadata. Kiểm tra dung lượng, phần mở rộng, đường dẫn, type; không thực thi tệp. Không cho upload ra ngoài data/files.
- Tải tệp qua API kiểm soát ID; không trả đường dẫn máy thật; tài liệu chủ động như HTML không được thực thi cùng origin. Ưu tiên download attachment; chỉ preview định dạng đã xử lí an toàn.
- API không chấp nhận CORS bất kỳ, kiểm tra Host/Origin phù hợp cho yêu cầu thay đổi, không cho trang web bên ngoài gọi ghi dữ liệu qua trình duyệt. Thiết kế chống truy cập đường dẫn vượt phạm vi và XSS.
- DB queries có tham số, đầu vào validate; ghi tệp tạm rồi cập nhật DB, có dọn tệp thất bại để tránh bản ghi mất file.
- Không cần đăng nhập giả cho V1: loopback chỉ giới hạn mạng, không chống người khác đang dùng cùng tài khoản Windows. Hướng dẫn ghi rõ giới hạn này.
- Muốn truy cập mạng hoặc nhiều người phải thiết kế lại xác thực/phân quyền trước khi bật.
- Không chứa API key trong frontend. Không thêm analytics hoặc gửi dữ liệu ngoài.
- Backup DB phải dùng cơ chế snapshot SQLite nhất quán hoặc đóng writer đúng cách; không sao chép riêng .db khi WAL vẫn đang ghi. Đọc SOP_04.

## Lệnh và chạy thử
Claude Code phải tạo scripts khởi động/dừng, build, test và kiểm tra thực tế. Không có lệnh ứng dụng nào được coi đã sẵn sàng ở phiên bản bộ tài liệu này.

## Đã triển khai (06/10/2026)
| Thành phần | Thực tế |
|---|---|
| Máy chủ | `app/server/src/index.mjs` – Node `node:http`, chỉ `127.0.0.1`, cổng 5178 (tự thử 5179–5187 nếu bận; `NMW_PORT` để cố định). Không phụ thuộc runtime ngoài Node ≥ 22.13 |
| CSDL | `node:sqlite` (SQLite 3.51), WAL, `foreign_keys=ON`, `synchronous=FULL`; migration có version ở `app/server/migrations/NNN_*.sql`, bảng `schema_migrations`; tự sao lưu trước migration nếu đã có dữ liệu |
| Giao diện | React 19.3 + TypeScript 5.9 + Vite 8.3, router History API tự viết; build vào `app/client/dist`, phục vụ cùng origin; SPA fallback |
| Bảo vệ | Host phải là `127.0.0.1:<cổng>`/`localhost:<cổng>`; yêu cầu ghi cần `X-Requested-With: NMW`, Origin cùng nguồn, `Sec-Fetch-Site` không cross-site; không CORS; CSP `default-src 'self'` |
| Tệp | Upload thân nhị phân + header `X-File-Name`; danh sách đuôi cho phép, kiểm chữ kí đầu tệp, ≤ 50 MB; ghi tạm rồi đổi tên; lỗi CSDL thì xóa tệp; tải xuống `attachment` + `octet-stream` + CSP sandbox |
| Sao lưu | `app/server/src/backup.mjs` – `VACUUM INTO`, manifest SHA-256, kiểm tra/diễn tập/khôi phục có rollback (xem SOP-04) |
| Kiểm thử | `npm test` (node:test, máy chủ thật + `NMW_ROOT` tạm); `tests/ui_check.py` (Playwright) |
| Chạy/dừng | `KHOI_DONG.bat`/`npm start`; `DUNG.bat`/`npm run stop` (đọc `data/run/server.json`, gọi API tắt) |
