# SOP-01 — Bắt đầu và kết thúc phiên

Chủ thực hiện: Claude Code; người kiểm tra kết quả: chủ dự án. Đầu vào: yêu cầu hiện tại, thư mục dự án, hồ sơ.

## Bắt đầu
1. Xác định thư mục; đọc CLAUDE, hồ sơ, STATE, DECISIONS.
2. Kiểm tra thay đổi hiện có; không ghi đè công việc chưa rõ nguồn. Đọc code/spec cần cho nhiệm vụ.
3. Đối chiếu yêu cầu mới với phạm vi. Tách thông tin đã xác nhận và giả định.
4. Lập kế hoạch ngắn có kết quả kiểm tra; tự thực hiện việc trong phạm vi, hỏi khi thiếu dữ liệu quyết định.

## Trong phiên
5. Thay đổi theo cụm nhỏ có thể kiểm tra, giữ dữ liệu thật. Không tự mở phạm vi sang công khai hoặc kết nối tài khoản.
6. Kiểm tra đúng rủi ro. Nếu thất bại, ghi rõ và sửa nguyên nhân; không thay kỳ vọng test để che lỗi.

## Kết thúc
7. Cập nhật STATE: thực tế đã có, đang làm, chưa có, trở ngại, bước tiếp theo.
8. Cập nhật DECISIONS nếu đổi kiến trúc/phạm vi; SESSION_LOG ghi ngắn bằng chứng.
9. Cập nhật hướng dẫn nếu lệnh/hành vi thay đổi. Không ghi đè dữ liệu kinh doanh bằng ghi chú bộ nhớ.
10. Bàn giao thay đổi, kết quả, cách mở và hạn chế; không tuyên bố hoàn tất khi thiếu bằng chứng.

Đầu ra: thay đổi được kiểm tra, bộ nhớ hiện hành, hướng dẫn đúng. Điều kiện hoàn thành: phiên sau có thể tiếp tục chỉ từ thư mục mà không phải đoán lại.
