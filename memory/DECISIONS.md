# Nhật ký quyết định

Các quyết định dưới đây là phương án của bộ khởi tạo để thực hiện khi người dùng giao prompt; không mô tả việc đã triển khai.

| ID | Ngày | Quyết định | Lý do | Trạng thái |
|---|---|---|---|---|
| D-001 | 06/10/2026 | Hai khối, sáu phân hệ | Bám bố cục mẫu và nhu cầu cá nhân | Đặc tả |
| D-002 | 06/10/2026 | V1 chạy cục bộ trên một máy | Đơn giản triển khai, phù hợp dữ liệu cá nhân | Đề xuất kỹ thuật |
| D-003 | 06/10/2026 | SQLite + file thật trong data | Lưu bền vững, sao lưu kiểm soát được | Đề xuất kỹ thuật |
| D-004 | 06/10/2026 | Email nhập thủ công | Chưa có yêu cầu/cấp quyền kết nối | Đặc tả V1 |
| D-005 | 06/10/2026 | Để trống năm bảo vệ | Người dùng chỉ nói 25/10 | Ràng buộc dữ liệu |
| D-006 | 06/10/2026 | Một tài liệu chính, nhiều nhãn | Tránh bản trùng và sai phiên bản | Ràng buộc dữ liệu |
| D-007 | 06/10/2026 | Máy chủ dùng `node:http` + `node:sqlite` có sẵn trong Node ≥ 22.13, không phụ thuộc runtime | Chạy trên Windows không cần `npm install`/biên dịch native (better-sqlite3 cần bản dựng theo hệ điều hành) | Đã triển khai; thay thế phần "API Node" chưa cụ thể của D-003 |
| D-008 | 06/10/2026 | Giao diện React 19 + TS 5.9 + Vite 8, build sẵn vào `app/client/dist` và giữ trong thư mục dự án | Người dùng chỉ cần Node để chạy; build lại khi sửa mã | Đã triển khai |
| D-009 | 06/10/2026 | Gói sao lưu là thư mục (`db.sqlite` bằng `VACUUM INTO` + `files/` + `manifest.json` SHA-256) trong `backups/`; khôi phục: kiểm tra → sao lưu hiện trạng → vùng tạm → hoán đổi → rollback | Không cần thư viện nén; dễ chép sang ổ khác; đáp ứng SOP-04 | Đã triển khai |
| D-010 | 06/10/2026 | Chặn ghi khác nguồn bằng header `X-Requested-With: NMW` + kiểm Origin/Sec-Fetch-Site; kiểm Host loopback | Không có đăng nhập ở V1; chống trang web ngoài và DNS rebinding | Đã triển khai |
| D-011 | 06/10/2026 | Dữ liệu minh họa ở CSDL riêng `data/demo`, chỉ bật thủ công, khởi động lại luôn về dữ liệu thật | Tách khỏi số liệu thật (AC-16) | Đã triển khai |
| D-012 | 06/10/2026 | Thêm bảng `document_relations`, trường `tasks.phase`, `emails.due_date`, `events.document_id`, `documents.material_type/tech_branch/last_opened_at` | Cần cho liên kết kế hoạch–học liệu, việc sau bảo vệ, hạn email, lịch dạy, "đang dùng" | Đã triển khai (migration 001) |
| D-013 | 06/10/2026 | Đổi tên hiển thị thành KHÔNG GIAN LÀM VIỆC VÕ VĂN BÉ HAI (chữ lồng "BH"); giữ tên thư mục `NGOC-MAI-WORKSPACE` và tiền tố kỹ thuật `nmw` | Quyết định cũ, không còn phù hợp với đặc tả gốc | Bị thay thế bởi D-018 |
| D-014 | 06/10/2026 | Trường "link nguồn" nhận đường dẫn thư mục/tệp trên máy (D:\…, \\máy\…) hoặc link web; nút "Mở thư mục" gọi máy chủ mở File Explorer (tệp: chỉ chọn, không chạy) | Người dùng yêu cầu thay link bằng đường dẫn tới thư mục; trình duyệt không mở được file:// từ trang http | Đã triển khai |
| D-015 | 06/10/2026 | Năm học mặc định 2026-2027 (biểu mẫu, trang chủ) | Người dùng yêu cầu | Đã triển khai |
| D-016 | 06/10/2026 | `KHOI_DONG.bat` chạy máy chủ trong cửa sổ thu nhỏ riêng; chỉ một máy chủ cho một thư mục; ghi `data/run/server.log`; bắt lỗi bất ngờ không cho sập; trang tự kết nối lại | Lần chạy đầu trên Windows báo "Không kết nối được máy chủ cục bộ": CSDL cho thấy tiến trình bị dừng đột ngột (không đóng sạch) – nhiều khả năng cửa sổ máy chủ bị đóng | Đã triển khai; chờ xác nhận trên Windows |
| D-017 | 06/10/2026 | Máy chủ chạy ẩn qua `app/scripts/mo-ung-dung.vbs`; `CAI_TU_KHOI_DONG.bat`/nút trong Quản lí dữ liệu tạo lối tắt Startup (chạy ẩn khi đăng nhập) + lối tắt màn hình nền; `GO_TU_KHOI_DONG.bat` gỡ | Người dùng yêu cầu lần sau khỏi bấm nút khởi động, mở thẳng bằng link; chỉ tạo/xóa 2 lối tắt của ứng dụng | Đã triển khai; CHƯA KIỂM TRA trên Windows |
| D-018 | 12/10/2026 | Khôi phục tên hiển thị chính thức thành KHÔNG GIAN LÀM VIỆC NGỌC MAI và ký hiệu nhận diện NM | Đặc tả dự án, tên thư mục và yêu cầu hiện tại đều xác định Ngọc Mai; tránh lệch giữa UI, API và tài liệu | Đã triển khai; thay thế D-013 |

## Mẫu bổ sung quyết định
ID; ngày; vấn đề; phương án được chọn; phương án đã cân nhắc; lý do; tác động; bằng chứng hoặc yêu cầu người dùng; quyết định nào bị thay thế. Không xóa lịch sử để che thay đổi; đánh dấu superseded nếu không còn dùng.
