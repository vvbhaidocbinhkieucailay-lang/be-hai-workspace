# Trạng thái hiện tại

> Mới nhất (12/10/2026): đã rà soát và chuẩn hóa tên hiển thị về **KHÔNG GIAN LÀM VIỆC NGỌC MAI** theo đặc tả gốc; ký hiệu header là `NM`. Đã sửa lỗi tiến trình khởi động lần hai trên Windows trả `0xC0000409` bằng cách cho kết nối kiểm tra máy chủ cũ đóng sạch trước khi thoát.

> Kiểm tra 12/10/2026 trên Windows 11 môi trường hiện tại: `npm install --ignore-scripts` thành công; `npm run typecheck` PASS; `npm run build` PASS; `npm test` PASS 15/15. Kiểm thử khởi động lần hai đã tái hiện và xác nhận mã thoát 0 sau bản sửa. Chưa thể xác nhận thao tác File Explorer, tự chạy cùng Windows và trải nghiệm người dùng cuối trên máy của cô.

Cập nhật: 12/10/2026. Trạng thái: **V1 đã xây, đã chuẩn hóa theo đặc tả và đạt kiểm thử kỹ thuật trên môi trường Windows hiện tại; chưa có dữ liệu cá nhân thật.**

## Đã có (có bằng chứng)
- Ứng dụng web cục bộ: máy chủ `app/server/src/` (Node, `node:http` + `node:sqlite`, không cần `npm install` để chạy), giao diện React 19 + TS + Vite 8 build sẵn ở `app/client/dist`.
- Migration `app/server/migrations/001_khoi_tao.sql` (schema v1) theo `docs/MO_HINH_DU_LIEU.md`; dự án luận văn khởi tạo với 25/10, năm/giờ/địa điểm để trống.
- Sáu phân hệ hoạt động với dữ liệu thật: kế hoạch bài dạy, tài liệu chuyên môn, văn bản quản lí, lịch & nhiệm vụ (tuần/tháng), email nhập tay → nhiệm vụ, hồ sơ luận văn (phiên bản, góp ý, tiến độ, mốc bảo vệ).
- Chung: tìm kiếm không dấu, nhãn, ghim, lưu trữ/khôi phục, upload/download có SHA-256, sao lưu/kiểm tra/diễn tập/khôi phục có rollback, chế độ minh họa tách CSDL.
- Lệnh: `KHOI_DONG.bat`, `DUNG.bat`, `npm start|serve|stop|build|typecheck|test`.
- Kiểm thử: `tests/api.test.mjs` 15/15 PASS (Node 24.18.1 trên Windows hiện tại); `tests/ui_check.py` 23/23 PASS (Chromium 1440/390px, chạy lại 12/10/2026 trên CSDL tạm); typecheck + build sạch.
- Báo cáo: `reports/2026-10-06_nghiem-thu-v1.md`; ảnh: `reports/2026-10-06_anh/`.
- Hướng dẫn: `docs/HUONG_DAN_SU_DUNG.md` (lệnh đã chạy thật).

## Chưa có / chưa kiểm tra
- **Chạy trên Windows của người dùng cuối**: `KHOI_DONG.bat`, `DUNG.bat`, mở trình duyệt tự động, đổi tên thư mục khi khôi phục và nút mở File Explorer — CHƯA KIỂM TRA thực địa.
- Dữ liệu thật: thư mục `data/` của dự án chưa khởi tạo (sẽ tạo ở lần chạy đầu); chưa có bản sao lưu thật.
- Nút tải lên gói sao lưu từ trình duyệt (hiện: chép thư mục gói vào `backups/`).
- Đo trải nghiệm 15 giây/30 giây; kiểm tra với trình đọc màn hình.
- Chưa dùng Git cho dự án (không có kho Git khi bắt đầu).

## Chưa xác nhận
Năm/giờ/địa điểm bảo vệ 25/10; phiên bản Node trên Windows của cô; nguồn dữ liệu cần nhập.

## Vướng mắc
- Phiên làm việc không có shell Windows; chỉ có Linux VM gắn thư mục, nên phần riêng Windows chưa xác minh.
- `node:sqlite` cần Node ≥ 22.13 (Node 22 còn gắn nhãn experimental; đã tắt cảnh báo).

## Bước tiếp theo
1. Trên Windows: cài Node LTS (≥ 22.13), nháy đúp `KHOI_DONG.bat`, kiểm tra trang mở được; thêm 1 kế hoạch, tắt bằng `DUNG.bat`, mở lại xem còn dữ liệu; ghi kết quả vào báo cáo (AC-01 Windows).
2. Tạo bản sao lưu thật đầu tiên và diễn tập khôi phục; chép gói sang ổ khác.
3. Nhập dữ liệu thật dần (kế hoạch HK1 2026-2027, văn bản đang dùng); khi có năm bảo vệ chính thức, cập nhật mốc bảo vệ.
4. Cân nhắc (cần yêu cầu mới): nút nhập gói sao lưu qua trình duyệt, khởi tạo Git cho mã nguồn.

## Quy tắc cập nhật
Giữ STATE ngắn, ưu tiên trạng thái hiện tại. Mỗi mục hoàn thành phải có file/commit/báo cáo minh chứng nếu có; thông tin cũ chuyển nhật ký. Không chép nội dung email, tài liệu gốc hoặc bí mật vào đây.
