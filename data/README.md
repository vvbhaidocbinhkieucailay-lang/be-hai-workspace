# Dữ liệu ứng dụng

Thư mục con được máy chủ tạo ở lần chạy đầu: `db/nmw.sqlite` (CSDL chính), `files/` (tệp đính kèm theo ID), `imports/`, `exports/`, `run/server.json` (cổng/PID đang chạy), `demo/` (dữ liệu minh họa tách riêng), `restore-test/` (diễn tập khôi phục), `_rollback/` (dữ liệu cũ sau mỗi lần khôi phục).

Không sửa SQLite trực tiếp bằng trình soạn thảo. Không chuyển thư mục vào public hoặc Git. Di chuyển dự án khi máy chủ đã dừng; dùng đường dẫn tương đối để giữ liên kết. Trạng thái 06/10/2026: chưa có dữ liệu thật.
