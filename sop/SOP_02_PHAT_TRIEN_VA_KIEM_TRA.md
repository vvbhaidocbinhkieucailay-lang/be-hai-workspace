# SOP-02 — Phát triển và kiểm tra

Áp dụng khi xây hoặc sửa chức năng. Đầu vào: yêu cầu được giao, mã hiện có, tiêu chí nghiệm thu.

1. Liên kết nhiệm vụ với FR/AC tương ứng và xác định dữ liệu có thể bị ảnh hưởng.
2. Nếu thay schema hoặc dữ liệu thật, tạo bản sao đúng SOP-04 trước khi migration.
3. Nếu đã có Git, xem trạng thái và bảo toàn thay đổi; không dùng reset/clean/force để dọn. Git cục bộ nếu sử dụng chỉ quản lí code/tài liệu, không phải data hoặc backup. Không tự push.
4. Triển khai từ tầng dữ liệu/API tới luồng giao diện; ít phụ thuộc; validation cả client/server.
5. Tạo kiểm thử có ý nghĩa cho thay đổi dữ liệu/logic. Thay màu hoặc chữ đơn giản chỉ cần kiểm tra hiển thị phù hợp, không viết test mô phỏng lại code.
6. Chạy build/typecheck và các test liên quan; chạy luồng lưu–refresh–restart nếu động tới lưu trữ.
7. Kiểm tra responsive/bàn phím nếu sửa giao diện; kiểm tra liên kết chéo nếu sửa nhiệm vụ hoặc tài liệu.
8. Ghi report có ngày, môi trường, lệnh, PASS/FAIL/CHƯA KIỂM TRA, bằng chứng và giới hạn.
9. Cập nhật spec/hướng dẫn/bộ nhớ. Nếu lỗi chưa giải quyết, giữ trạng thái chưa hoàn thành và đề xuất bước xử lí.

Không thêm test chỉ để tăng số lượng. Không đưa thông tin thật vào test fixture. Không xóa bản sao để che migration thất bại.
