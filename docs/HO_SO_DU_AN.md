# Hồ sơ dự án

## Nhận diện
- Mã: NMW-001; phiên bản đặc tả: 1.0; lập ngày 06/10/2026.
- Chủ sử dụng: cô Ngọc Mai; cá nhân giảng dạy Sinh học và Công nghệ.
- Tên: KHÔNG GIAN LÀM VIỆC NGỌC MAI.
- Giai đoạn hiện tại (06/10/2026): V1 đã lập trình và đạt kiểm thử kỹ thuật; chờ chạy thử trên Windows và nhập dữ liệu thật (xem `memory/STATE.md`).
- Tham chiếu: `references/giao-dien-tham-chieu.png`.

## Vấn đề và mục tiêu
Tài liệu, công việc và trao đổi nằm ở nhiều nơi; khó tìm bản đang dùng và theo dõi hạn. Website cần giúp tìm tài liệu nhanh, biết việc ưu tiên và kiểm soát tiến độ. Mục tiêu trải nghiệm để kiểm tra với người dùng: tìm một kế hoạch trong khoảng 15 giây và thêm một việc trong khoảng 30 giây; đây là mục tiêu, chưa phải kết quả đo.

## Phạm vi V1
Một máy, một người; web cục bộ có lưu dữ liệu. Hai khối và sáu phân hệ. Quản lí metadata, tệp đính kèm, nhiệm vụ, lịch, email nhập tay, hồ sơ luận văn. Có tìm kiếm danh mục, bộ lọc, ghim và sao lưu/khôi phục.

## Ngoài phạm vi V1
Đồng bộ nhiều thiết bị; tài khoản nhiều người; website công khai; OAuth email; gửi thư; crawler pháp luật; OCR hoặc tìm toàn văn PDF; tạo bài dạy bằng AI; sửa Word trực tiếp trong trình duyệt; thông báo khi ứng dụng đã đóng. Mọi mở rộng phải có yêu cầu mới và cập nhật hồ sơ.

## Giả định và điểm chưa xác nhận
| Nội dung | Trạng thái | Cách xử lí |
|---|---|---|
| Máy sử dụng Windows | Phương án thiết kế | Claude Code kiểm tra môi trường |
| Đường dẫn D:\DU_AN_CA_NHAN\NGOC-MAI-WORKSPACE | Đề xuất | Nếu không có D dùng Documents |
| Giữ tinh thần mẫu, hai nhóm/sáu phân hệ | Căn cứ trao đổi hiện tại | Thực hiện theo đặc tả |
| V1 cục bộ, SQLite | Đề xuất kỹ thuật | Thực hiện khi người dùng giao prompt; ghi thay đổi nếu cần |
| Ngày bảo vệ 25/10 | Người dùng đã nêu | Lưu ngày/tháng |
| Năm, giờ, địa điểm bảo vệ | Chưa xác nhận | Để trống; chưa đếm ngược |
| Thời khóa biểu, email, văn bản cụ thể | Chưa được cung cấp trong bộ này | Khởi tạo trống |

## Thứ tự ưu tiên
P0: lưu dữ liệu tin cậy, cấu trúc sáu phân hệ, liên kết đúng, không lộ tệp.
P1: trải nghiệm tìm kiếm, lịch, nhập liệu, backup/restore, responsive.
P2: tinh chỉnh màu, biểu tượng, chuyển động nhẹ.

## Hoàn thành dự án V1
Các tiêu chí cốt lõi trong TIEU_CHI_NGHIEM_THU đạt, có hướng dẫn chạy/dừng, bản sao kiểm thử khôi phục, báo cáo hạn chế và STATE được cập nhật. Không lấy số lượng file hay độ đẹp của ảnh chụp làm bằng chứng thay cho chức năng.

> Tên hiển thị chính thức của ứng dụng là **KHÔNG GIAN LÀM VIỆC NGỌC MAI**; thư mục dự án vẫn là `NGOC-MAI-WORKSPACE`. Năm học mặc định 2026-2027. Trường nguồn nhận đường dẫn thư mục trên máy (vd. `D:\2026-2027\Giao an`).
