# Yêu cầu chức năng

| Mã | Chức năng và hành vi | Dữ liệu liên quan |
|---|---|---|
| FR-01 | Tổng quan lấy dữ liệu thực; tối đa 3 ưu tiên; việc quá hạn/sắp hạn; link đến danh sách đã lọc | tasks, events, documents, projects |
| FR-02 | Kế hoạch bài dạy: thêm/sửa/lưu trữ; tìm và lọc năm học/môn/khối/học kì; tệp học liệu | documents, lesson_plans |
| FR-03 | Chuyên môn: Sinh học/Công nghệ; phân loại chủ đề và dạng học liệu; xem bản gốc | documents, tags |
| FR-04 | Văn bản: số, cơ quan, ngày, loại, nguồn; tóm tắt cá nhân; ngày kiểm tra hiệu lực | documents, official_documents |
| FR-05 | Nhiệm vụ: thêm/sửa, ưu tiên, hạn, trạng thái; lọc; hoàn tất; mở nguồn | tasks, task_links |
| FR-06 | Lịch: tuần/tháng cùng dữ liệu; sự kiện có bắt đầu/kết thúc; nhiệm vụ có hạn hiển thị đúng ngày | events, tasks |
| FR-07 | Email: nhập tay metadata/ghi chú/link; tạo và mở nhiệm vụ; tạo lại không sinh bản trùng | emails, tasks |
| FR-08 | Luận văn: tài liệu, góp ý/giải trình, checklist, lịch; chỉ một phiên bản tài liệu hiện hành | projects, feedback, documents, document_versions, tasks |
| FR-09 | Tìm kiếm tên, số kí hiệu, mô tả và nhãn; hỗ trợ không dấu; lọc kết hợp AND giữa nhóm lọc | Chỉ metadata, chưa OCR/toàn văn tệp |
| FR-10 | Upload/download bản gốc, link nguồn, ghim, lưu trữ/khôi phục bản ghi | attachments, documents |
| FR-11 | Sao lưu/khôi phục DB và tệp theo SOP; báo lỗi có thể hiểu; không ghi đè im lặng | backups, data |
| FR-12 | Cài đặt mốc bảo vệ; thiếu năm thì không tính đếm ngược; định dạng Việt Nam | settings, projects |

## Trạng thái
- Kế hoạch: đang soạn, sẵn sàng, đã dạy, cần điều chỉnh.
- Nhiệm vụ: chưa làm, đang làm, chờ phản hồi, hoàn tất, hủy. Quá hạn là giá trị tính từ hạn và trạng thái, không lưu độc lập.
- Email: chưa xử lí, đang xử lí, chờ phản hồi, hoàn tất. Hoàn thành nhiệm vụ không tự động khẳng định đã trả lời email.
- Văn bản: mặc định chưa kiểm tra hiệu lực; có nguồn và ngày kiểm tra khi cập nhật. Không ép văn bản hành chính vào nhãn hiệu lực pháp lí không phù hợp.
- Lưu trữ là ẩn khỏi danh sách mặc định; còn có thể khôi phục. Xóa vĩnh viễn không phải chức năng mặc định V1.

## Tính nhất quán
- Thay đổi nhiệm vụ được phản ánh trên tổng quan, lịch và dự án.
- Tuần bắt đầu thứ Hai; công việc cả ngày không bị đổi ngày do UTC.
- Tiến độ luận văn = nhiệm vụ bắt buộc hoàn tất / nhiệm vụ bắt buộc không hủy. Nếu chưa có nhiệm vụ bắt buộc, hiển thị chưa thiết lập, không hiển thị 0/0 hoặc 100%.
- Không đánh dấu đã gửi email hoặc đã nộp hồ sơ chỉ vì người dùng tải tệp xuống.
- Tìm kiếm tài liệu đa nhãn trả một kết quả chính với đầy đủ nhãn, không nhân bản.
- Mọi nút lưu phải phản hồi thành công hoặc thất bại; lỗi không làm mất dữ liệu đã nhập.

## Dữ liệu và nhập liệu
Trường bắt buộc tối thiểu: tên tài liệu hoặc tên việc. Trường không biết để trống; không điền bịa. Validation ở cả frontend/backend. Ngày kết thúc sự kiện không trước ngày bắt đầu. Link chỉ nhận giao thức được phép. Không tải link ngoài về tự động.

## Tình trạng triển khai (06/10/2026)
FR-01 … FR-12 đã có trong V1 và có kiểm thử API/trình duyệt (xem báo cáo `reports/2026-10-06_nghiem-thu-v1.md`). Giới hạn: FR-11 khôi phục từ gói đã đặt trong `backups/` (chưa có nút tải gói lên qua trình duyệt); FR-09 chưa tìm trong nội dung tệp (đúng phạm vi).
