# SOP-04 — Sao lưu và khôi phục

## Mục tiêu
Phục hồi được cả cơ sở dữ liệu và tệp với quan hệ đúng. Git, bộ nhớ Markdown và export danh sách CSV không thay thế bản sao đầy đủ.

## Khi sao lưu
Trước migration/nhập hàng loạt/khôi phục và sau đợt nhập dữ liệu quan trọng. Có thể nhắc sao lưu khi ứng dụng đang mở; không tuyên bố có lịch tự động khi chưa triển khai scheduler. Giữ các bản còn cần; không tự xóa bản cũ.

## Sao lưu
1. Chọn tên duy nhất có timestamp, ví dụ NMW_YYYYMMDD_HHMMSS; tạo ở backups hoặc vị trí người dùng chọn.
2. Tạm chặn thao tác ghi có thể làm lệch DB và file; dùng snapshot SQLite nhất quán/backup API phù hợp hoặc đóng writer đúng cách.
3. Sao lưu DB cùng toàn bộ tệp được tham chiếu. Không chỉ chép .db đang hoạt động và bỏ WAL.
4. Tạo manifest: phiên bản ứng dụng/schema, ngày giờ/timezone, số bản ghi từng bảng, danh sách file với kích thước và SHA-256.
5. Kiểm tra tính toàn vẹn DB, file tồn tại, checksum; chỉ báo thành công sau kiểm tra.
6. Đặt bản sao hoàn chỉnh ở đích, kết thúc chế độ tạm chặn ghi; lưu kết quả. Lỗi phải giữ dữ liệu gốc nguyên vẹn và dọn phần tạm có kiểm soát.

## Khôi phục
1. Người dùng chọn gói và xác nhận mục tiêu. Mặc định diễn tập vào thư mục/DB tạm, không đè data hiện tại.
2. Kiểm tra manifest/schema/checksum; chặn đường dẫn tuyệt đối, ../, symlink nguy hiểm và file ngoài phạm vi khi giải nén; giới hạn dung lượng.
3. So sánh phiên bản; không restore schema không tương thích vào ứng dụng đang chạy.
4. Nếu thay dữ liệu thật: hiển thị nguồn/đích và tác động; có xác nhận cụ thể; sao lưu dữ liệu hiện tại trước.
5. Dừng writer, restore vào vùng tạm; kiểm tra khóa ngoại, số bản ghi, tệp và checksum; chỉ chuyển sang data chính khi đạt. Giữ bản cũ để rollback.
6. Khởi động, kiểm tra mẫu tài liệu/quan hệ/lịch; ghi report. Nếu lỗi, trở về bản trước và báo rõ.

## Tần suất và nơi lưu
V1 không tự gửi backup ra mạng. Người dùng nên chép định kỳ bản đã kiểm tra sang thiết bị khác để giảm rủi ro hỏng ổ. Đường dẫn đó cần do người dùng chọn. Bản sao chứa dữ liệu cá nhân, không đẩy vào Git/public.

## Điều kiện đạt
Diễn tập restore thành công và đối chiếu DB+tệp, không chỉ kiểm tra có file ZIP. Ghi thời điểm lần diễn tập gần nhất trong báo cáo.

## Thực hiện trong V1 (06/10/2026)
- Sao lưu: Quản lí dữ liệu → “Tạo bản sao lưu ngay” (API `POST /api/backups`). Khóa ghi trong lúc chạy, `VACUUM INTO` → `backups/NMW_YYYYMMDD_HHMMSS/db.sqlite`, chép tệp được tham chiếu vào `files/`, `manifest.json` (schema, giờ VN, số bản ghi từng bảng, SHA-256), tự kiểm tra rồi mới đổi tên từ `.tmp_…`.
- Kiểm tra: nút “Kiểm tra” (manifest, đường dẫn an toàn, không symlink, kích thước + SHA-256, integrity_check, foreign_key_check, số bản ghi, mọi attachment có tệp).
- Diễn tập: nút “Diễn tập” → `data/restore-test/<gói>__<thời điểm>/`, đối chiếu lại; không đụng dữ liệu thật.
- Khôi phục: gõ `KHOI PHUC <tên gói>`; gói lỗi bị từ chối trước khi thay; tự tạo gói `…_truoc_khoi_phuc`; dữ liệu cũ giữ ở `data/_rollback/<thời điểm>/`; lỗi giữa chừng tự trả lại.
- Lần diễn tập gần nhất: 06/10/2026, trên dữ liệu thử (xem báo cáo nghiệm thu). Chưa diễn tập trên dữ liệu thật vì chưa có dữ liệu thật.
