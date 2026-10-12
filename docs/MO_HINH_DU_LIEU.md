# Mô hình dữ liệu logic

Đây là đặc tả để chuyển thành migration, không phải cơ sở dữ liệu đã tạo. ID ổn định; timestamp tạo/cập nhật; trường nullable cho thông tin chưa biết. Nội dung tiếng Việt UTF-8.

| Thực thể | Trường chính | Quan hệ/quy tắc |
|---|---|---|
| documents | id, title, category, summary, subject, grade, school_year, source_url, pinned, archived_at, current_version_id | Một bản ghi chính; category = lesson/material/official/thesis |
| document_versions | id, document_id, version_label, notes, created_at | Một document có nhiều version; current_version_id phải thuộc đúng document |
| attachments | id, version_id, stored_relative_path, original_name, mime, bytes, sha256 | File thuộc version; kiểm tra checksum; không lưu đường dẫn tuyệt đối người dùng |
| tags/document_tags | id, label; document_id, tag_id | Quan hệ nhiều–nhiều; cặp liên kết duy nhất |
| lesson_plans | document_id, semester, class_label, lesson_title, periods, status, reflection | Mở rộng document category lesson |
| official_documents | document_id, number, issuer, document_type, issued_date, validity_status, validity_source, checked_date, action_note | Mặc định hiệu lực chưa kiểm tra; tóm tắt là diễn giải cá nhân |
| tasks | id, title, notes, due_date, due_at, priority, status, project_id, required_for_progress, completed_at, archived_at | Due_date cho cả ngày hoặc due_at cho giờ cụ thể, không dùng đồng thời |
| emails | id, subject, sender, received_at, note, source_url, status, archived_at | Nhập thủ công; không giả lập việc đã gửi |
| task_documents/task_emails | task_id, document_id/email_id | Liên kết nhiều–nhiều duy nhất; việc không bị sao chép |
| events | id, title, start_at, end_at, start_date, end_date, all_day, location, project_id, linked_task_id | Timed dùng instant; all-day dùng ngày, quy ước end_date exclusive |
| projects | id, name, kind, defense_day, defense_month, defense_year, defense_time, defense_location, date_confirmed | 25/10 đã biết; year/time/location null; chưa đếm ngược |
| project_documents | project_id, document_id | Không sao chép nội dung tài liệu |
| feedback | id, project_id, document_version_id, reviewer, content, section_ref, response_note, linked_task_id, status | Góp ý gắn bản được góp ý, không âm thầm chuyển sang bản khác |
| settings | key, value, schema_version | Chỉ cấu hình, không chứa bí mật |

## Thời gian
- Hiển thị ngày theo dd/mm/yyyy; timezone Asia/Ho_Chi_Minh.
- Sự kiện có giờ lưu dạng instant UTC cùng quy ước timezone hiển thị; việc cả ngày lưu YYYY-MM-DD, không ép qua Date UTC làm lệch ngày.
- Tuần bắt đầu thứ Hai. Hạn chỉ có ngày là quá hạn khi đã sang ngày tiếp theo theo timezone người dùng.
- Đếm ngược bảo vệ chỉ tính khi day/month/year hợp lệ và đã xác nhận. Thiếu giờ thì đếm theo ngày, không tự gán thời điểm chính thức.

## Toàn vẹn
- Có index cho tìm kiếm/lọc và khóa ngoại; một file checksum trùng được cảnh báo, không tự xóa.
- Lưu trữ không hủy liên kết. Không cascade xóa vĩnh viễn tài liệu khi lưu trữ dự án.
- Chọn bản hiện hành bằng một trường tham chiếu và transaction, tránh hai cờ current song song.
- Tạo task từ email cần idempotency hoặc kiểm tra liên kết hiện có; vẫn có thể tạo việc thứ hai khác nội dung nếu người dùng chủ động chọn.
- Tìm kiếm không dấu chỉ tạo khóa chuẩn hóa tìm kiếm, giữ nguyên nội dung gốc có dấu.
- Sample/demo dùng DB và kho file riêng, không nằm cùng dữ liệu thật.

## Đã hiện thực (migration 001, 06/10/2026)
- Tất cả thực thể trên đã có bảng; thêm: `document_relations` (liên kết tài liệu–tài liệu, không nhân bản chiều ngược), `documents.material_type` (dạng học liệu/loại hồ sơ luận văn), `documents.tech_branch`, `documents.last_opened_at`, `documents.search_text`; `official_documents.field`; `tasks.phase` (trước/sau bảo vệ); `emails.due_date`; `events.document_id` (lịch dạy gắn kế hoạch); `archived_at` cho tasks/emails/events/feedback.
- Ràng buộc trong CSDL: CHECK trạng thái; `due_date`/`due_at` không đồng thời; sự kiện cả ngày `end_date > start_date` (exclusive); hiệu lực còn/hết bắt buộc có nguồn + ngày kiểm tra; trigger bảo đảm `current_version_id` thuộc đúng tài liệu; `date_confirmed` chỉ khi đủ ngày/tháng/năm.
- ID dạng `<tiền tố>_<20 hex>` (doc_, ver_, att_, task_, mail_, evt_, fb_, tag_); dự án luận văn cố định `prj_luan_van`.
- `search_text` là khóa chuẩn hóa không dấu, nội dung gốc giữ nguyên.
