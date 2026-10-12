# Đặc tả giao diện

## Căn cứ ảnh
Ảnh tham chiếu có thanh ngang gồm thương hiệu và menu; tiêu đề trung tâm rất lớn; mô tả; hai thẻ Giáo viên/Học sinh; nền sáng, màu xanh/hồng/tím, bo góc; nút thông báo nổi. Chỉ biết phần nhìn thấy trong ảnh, không suy diễn chức năng bên dưới.

## Giữ và thay
Giữ header ngang, nền thoáng, hai khối lớn. Thay hai đối tượng bằng hai nhóm công việc. Rút hero còn tiêu đề và một dòng; bỏ thương hiệu/ảnh người khác, nút mời cà phê/Zalo và thông tin kỹ thuật nền tảng. Không đặt banner nổi che nội dung.

## Thứ tự nội dung trang chủ
| Thứ tự | Khu vực | Nội dung |
|---|---|---|
| 1 | Header | Nhận diện, 3 mục điều hướng, tìm kiếm, thêm mới |
| 2 | Hero gọn | Không gian làm việc Bé Hai; Giảng dạy · Chuyên môn · Công việc · Luận văn |
| 3 | Việc cần chú ý | Ưu tiên, hạn gần, mốc luận văn; mỗi thẻ mở chi tiết |
| 4 | Hai khối | Trái: kế hoạch/chuyên môn/văn bản. Phải: lịch/email/luận văn |
| 5 | Đang thực hiện | Lịch tuần và nhiệm vụ gần hạn |
| 6 | Truy cập nhanh | Tài liệu đã ghim, vừa cập nhật, đang dùng |
| 7 | Footer | Hướng dẫn, quản lí dữ liệu |

## Điều hướng dự kiến
`/` tổng quan; `/ke-hoach-bai-day`; `/chuyen-mon`; `/van-ban`; `/lich-cong-viec`; `/email-quan-trong`; `/luan-van`; `/cai-dat`.
Menu nhóm dẫn tới mục tương ứng hoặc mở menu con, không tạo trang trung gian rỗng. Mỗi phân hệ có danh sách, bộ lọc, thêm mới, chi tiết/sửa. URL chi tiết dùng ID ổn định và phải mở lại được.

## Thị giác
- Nền trắng ngà hoặc xám rất nhạt; nội dung tối, rõ. Xanh ngọc cho giảng dạy, xanh tím cho công việc; cam/đỏ chỉ dùng cho trạng thái cần chú ý.
- Font hệ thống hỗ trợ tiếng Việt; thân bài khoảng 16px, chiều cao dòng thoáng. Không phụ thuộc font CDN để chạy cục bộ.
- Card bo góc vừa phải; bóng nhẹ; tránh glow và gradient làm giảm tương phản.
- Desktop nội dung tối đa khoảng 1200–1280px; hai khối cân đối, mỗi khối ba hàng chức năng; mobile một cột.
- Ở màn hình cao khoảng 900px, phải thấy dải ưu tiên và phần đầu hai khối chính mà không cần cuộn.
- Vùng bấm đủ lớn; nhãn không chỉ là icon; focus bàn phím rõ; dialog có quản lí focus; giảm chuyển động theo lựa chọn hệ thống.

## Trạng thái bắt buộc
Rỗng có hướng dẫn thêm dữ liệu, loading không giả số, lỗi có thử lại, lưu thành công rõ, mất kết nối giữ form, chưa cấu hình ngày bảo vệ có nhãn cần xác nhận. Không sử dụng đồng hồ đếm ngược cố định trong code.

## Cách đánh giá
Chụp trang ở desktop và mobile sau khi xây dựng, so với cấu trúc ảnh; kiểm tra cuộn ngang, che nội dung, tiêu đề quá lớn và thao tác bàn phím. Ảnh đẹp không thay thế kiểm thử dữ liệu.

## Đã hiện thực (06/10/2026)
- Các tuyến: `/`, `/ke-hoach-bai-day`, `/chuyen-mon`, `/van-ban`, `/lich-cong-viec` (`?view=thang`), `/email-quan-trong` (+ `/:id`), `/luan-van`, `/cai-dat`, `/tai-lieu/:id`, `/nhiem-vu/:id`, `/tim-kiem?q=`, `/huong-dan`.
- Màu: xanh ngọc `#0f766e` (giảng dạy), xanh tím `#5646c0` (công việc), cảnh báo luôn có chữ (“Quá hạn”, “Cần xác nhận”, “Chưa kiểm tra hiệu lực”). Font hệ thống, không CDN.
- Ở 1440×900 thấy dải ưu tiên và tiêu đề hai khối không cần cuộn; 390px một cột, không tràn ngang (ảnh: `reports/2026-10-06_anh/`).
- Nhận diện dùng chữ lồng “NM”, không dùng thương hiệu/ảnh của website tham chiếu; bỏ nút nổi, banner quảng cáo.
