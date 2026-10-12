# Tiêu chí nghiệm thu V1

Hiện trạng (06/10/2026): kết quả từng mục ở `reports/2026-10-06_nghiem-thu-v1.md` – AC-02…AC-18 PASS về kỹ thuật; AC-01 PASS trên Linux VM, CHƯA KIỂM TRA trên Windows. Claude Code tạo báo cáo ghi thời điểm, môi trường, lệnh, kết quả và bằng chứng. Không đổi trạng thái dựa trên ý định.

| Mã | Kiểm tra | Điều kiện đạt |
|---|---|---|
| AC-01 | Khởi động/dừng | Từ máy đã đủ phụ thuộc, lệnh hướng dẫn chạy được; chỉ bind loopback; tắt đúng tiến trình |
| AC-02 | Trang chủ và 6 phân hệ | Liên kết đúng; không nút giả; dữ liệu rỗng có hướng dẫn |
| AC-03 | Kế hoạch/tài liệu | Tạo, sửa, lọc, ghim, lưu trữ, khôi phục được |
| AC-04 | Lưu bền vững | Nhập bản ghi, refresh, đóng trình duyệt, restart máy chủ; bản ghi và file còn nguyên |
| AC-05 | Một tài liệu nhiều nhãn | Tìm được từ nhiều nhóm, chỉ có một ID chính |
| AC-06 | Lịch | Sửa ở tuần phản ánh ở tháng; tuần thứ Hai; sự kiện cả ngày không lệch ngày |
| AC-07 | Email → nhiệm vụ | Tạo/open task đúng email; bấm lại không sinh bản trùng ngoài ý muốn |
| AC-08 | Luận văn | Chỉ một bản hiện hành; góp ý đúng bản; tiến độ từ đầu việc thực; thiếu năm không đếm ngược |
| AC-09 | Văn bản | Có link nguồn và nhãn tóm tắt cá nhân; chưa kiểm tra không được hiển thị còn hiệu lực |
| AC-10 | File | Upload/download đúng checksum; tên bất thường không thoát data; không lộ tệp qua public |
| AC-11 | Backup/restore | Sao lưu DB+tệp nhất quán; restore vào vùng test; khớp bản ghi, quan hệ và SHA-256 |
| AC-12 | Dữ liệu hỏng | Restore gói thiếu file/sai checksum bị từ chối trước khi thay dữ liệu thật |
| AC-13 | Giao diện | Kiểm tra 390px và 1440px; không che nút/tràn ngang; có label/focus; bàn phím thao tác được |
| AC-14 | Lỗi lưu | Form không mất nội dung; báo lỗi rõ; không sinh dữ liệu nửa vời |
| AC-15 | Kiểm tra mã | Build/typecheck và kiểm thử cốt lõi chạy thành công; ghi lệnh và output tóm tắt |
| AC-16 | Tách dữ liệu mẫu | Demo được đánh dấu, không tăng số liệu thật, có cách thoát |
| AC-17 | Ranh giới cục bộ | Yêu cầu ghi sai Origin/Host bị từ chối; không bind LAN; không request analytics |
| AC-18 | Bàn giao | Có lệnh chạy thực tế, nơi lưu dữ liệu, SOP sao lưu, STATE và giới hạn cập nhật |

Mục tiêu tìm tài liệu 15 giây/thêm việc 30 giây cần người dùng thao tác thử và ghi thời gian thực; không tự xác nhận thay người dùng. Chỉ mở rộng test để giải quyết lỗi/rủi ro còn lại, không viết hàng loạt test lặp lại implementation.
