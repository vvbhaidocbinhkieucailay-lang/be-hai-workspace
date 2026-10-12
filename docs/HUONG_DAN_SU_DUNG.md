# Hướng dẫn sử dụng — KHÔNG GIAN LÀM VIỆC BÉ HAI (V1)

Cập nhật: 06/10/2026. Các lệnh dưới đây đã chạy thành công trên Linux VM của ứng dụng Claude gắn với thư mục dự án (Node 22.23.2). **Chưa chạy thử trực tiếp trên Windows** — lần đầu mở trên Windows, hãy làm đúng mục 1–2 và báo lại nếu có lỗi.

## 1. Cài đặt một lần
1. Cài **Node.js bản LTS** (≥ 22.13; khuyên dùng 24 LTS) từ trang chính thức https://nodejs.org/. Kiểm tra: mở Command Prompt, gõ `node -v`.
2. Không cần `npm install` để *chạy* ứng dụng: máy chủ chỉ dùng thư viện có sẵn của Node (`node:http`, `node:sqlite`) và giao diện đã được build sẵn trong `app/client/dist`.
3. Chỉ khi muốn *sửa mã giao diện*: chạy `npm ci` tại thư mục gốc dự án (cần mạng), rồi `npm run build`.

## 2. Mở và tắt ứng dụng
| Việc | Cách làm (tại thư mục gốc `NGOC-MAI-WORKSPACE`) |
|---|---|
| Mở | Nháy đúp `KHOI_DONG.bat` (thư mục dự án trên ổ D). Máy chủ chạy **ẩn** (không có cửa sổ), trình duyệt tự mở `http://127.0.0.1:5178/`. Nếu máy chủ đã chạy sẵn, chỉ mở trình duyệt |
| Trang báo “Không kết nối được máy chủ cục bộ” | Máy chủ đang tắt (vd. vừa khởi động lại máy mà chưa bật tự chạy): mở lối tắt trên màn hình nền hoặc `KHOI_DONG.bat`; trang tự kết nối lại |
| Mở không tự bật trình duyệt | `npm run serve` |
| Tắt | Nhấn **Ctrl + C** trong cửa sổ máy chủ, hoặc nháy đúp `DUNG.bat` / `npm run stop` |
| Cổng 5178 bị chiếm | Ứng dụng tự thử 5179…5187 và in địa chỉ thật trong cửa sổ. Muốn cố định: `set NMW_PORT=5300` rồi `npm run serve` |

- Máy chủ chỉ lắng nghe `127.0.0.1` (không mở ra mạng LAN). Không tự tắt chương trình khác.
- Đóng trình duyệt không làm mất dữ liệu; đóng cửa sổ máy chủ thì ứng dụng ngừng (dữ liệu đã lưu vẫn còn).
- Luôn mở bằng `http://127.0.0.1:…` (không mở tệp `index.html` trực tiếp).

## 2b. Mở nhanh lần sau – không cần bấm KHOI_DONG.bat
1. Chạy **một lần** `CAI_TU_KHOI_DONG.bat` (hoặc trong ứng dụng: Quản lí dữ liệu → “Bật tự chạy cùng Windows + tạo lối tắt”).
2. Từ đó, mỗi lần đăng nhập Windows máy chủ **tự chạy ẩn** (không có cửa sổ đen để lỡ tay đóng).
3. Mở ứng dụng bằng lối tắt **“Khong gian lam viec Be Hai”** trên màn hình nền, hoặc lưu dấu trang `http://127.0.0.1:5178/` (Ctrl + D) và mở từ trình duyệt.
4. Lối tắt trên màn hình nền còn tự bật máy chủ nếu nó đang tắt.
5. Muốn bỏ chế độ này: chạy `GO_TU_KHOI_DONG.bat` (dữ liệu không bị ảnh hưởng). Tắt máy chủ đang chạy: `DUNG.bat`.

## 3. Bố cục
- **Header**: Tổng quan · Giảng dạy & chuyên môn ▾ · Công việc & luận văn ▾ · ô tìm kiếm · **Thêm mới**.
- **Trang chủ**: giới thiệu ngắn → Việc ưu tiên / Hạn gần nhất / Mốc bảo vệ → hai khối lớn (trái: Kế hoạch bài dạy, Tài liệu chuyên môn, Văn bản quản lí; phải: Lịch & nhiệm vụ, Email quan trọng, Hồ sơ luận văn) → lịch tuần + việc sắp đến hạn → tài liệu đã ghim/vừa cập nhật/đang dùng → chân trang (Hướng dẫn, Quản lí dữ liệu).

## 4. Kế hoạch, tài liệu, văn bản
- **Thêm mới → Kế hoạch bài dạy / Tài liệu chuyên môn / Văn bản quản lí**. Trường bắt buộc duy nhất là tên; trường chưa biết để trống.
- Lọc theo năm học, môn, khối, học kì, trạng thái (kế hoạch); môn Sinh học/Công nghệ, dạng, phân môn Công nghệ (chuyên môn); hiệu lực, loại (văn bản); nhãn; “chỉ xem mục đã lưu trữ”.
- Mở một mục → **Phiên bản & tệp bản gốc**: tải tệp (≤ 50 MB; PDF, Word, Excel, PowerPoint, ODF, ảnh, txt/csv/md, mp3/mp4, zip). Bản sửa mới nên tải thành *phiên bản mới* của cùng tài liệu; chỉ một bản là “hiện hành”.
- Nhãn: gõ nhiều nhãn cách nhau bằng dấu phẩy. Một tài liệu được tìm thấy theo mọi nhãn nhưng chỉ có một bản lưu chính.
- **Liên kết**: thêm tài liệu liên quan (vd. kế hoạch ↔ đề/học liệu), tạo nhiệm vụ hoặc lịch dạy gắn với tài liệu.
- Văn bản: mặc định “Chưa kiểm tra hiệu lực”. Chỉ chọn còn/hết hiệu lực khi đã tự kiểm tra và nhập link nguồn + ngày kiểm tra. Tóm tắt là diễn giải cá nhân.
- **Ghim** để hiện ở trang chủ; **Lưu trữ** để ẩn (khôi phục được ở danh sách lưu trữ).

## 4b. Đường dẫn thư mục thay cho link
- Ô “Đường dẫn thư mục/tệp (hoặc link)” nhận đường dẫn trên máy, ví dụ `D:\2026-2027\Giao an\Sinh 10` (sao chép từ thanh địa chỉ File Explorer). Dấu `/` được tự đổi thành `\`.
- Trong trang chi tiết: **Mở thư mục** mở đúng thư mục trong File Explorer; nếu là đường dẫn tệp thì mở thư mục chứa và chọn sẵn tệp (không tự chạy tệp). **Sao chép đường dẫn** để dán vào File Explorer.
- Vẫn nhận link `http(s)://` khi cần. Năm học mặc định trong biểu mẫu là 2026-2027.
- Quản lí dữ liệu có nút mở thư mục dự án, thư mục dữ liệu và thư mục sao lưu.

## 5. Lịch & nhiệm vụ
- Chế độ **Tuần** (bắt đầu thứ Hai) và **Tháng** dùng cùng dữ liệu. Giờ là giờ Việt Nam.
- Nhiệm vụ: hạn cả ngày, hạn có giờ, hoặc chưa đặt hạn; ưu tiên; trạng thái (chưa làm, đang làm, chờ phản hồi, hoàn tất, hủy). Việc cả ngày chỉ quá hạn khi đã sang ngày hôm sau.
- Đánh dấu hoàn tất bằng ô vuông ở danh sách hoặc nút “Hoàn tất” trong chi tiết. Lọc: quá hạn, hôm nay, 7 ngày tới, chưa đặt hạn, trạng thái, ưu tiên.
- Bấm vào sự kiện trên lịch để sửa hoặc lưu trữ.

## 6. Email quan trọng (nhập tay)
- Ghi tiêu đề, người gửi, ngày nhận, hạn, ghi chú ngắn, link thư gốc. Ứng dụng **không** đọc/gửi thư.
- **Tạo nhiệm vụ**: tạo một việc gắn với email; bấm lại sẽ **mở việc đã có**, không tạo trùng.
- Hoàn tất nhiệm vụ không tự đánh dấu email đã trả lời — cập nhật trạng thái email khi thật sự xong.

## 7. Hồ sơ luận văn
- Tài liệu luận văn (bản thảo, hồ sơ, slide, câu hỏi bảo vệ, giải trình…) có phiên bản và một bản hiện hành.
- **Góp ý & giải trình**: chọn bản được góp ý; góp ý luôn gắn với bản đó. Có thể tạo nhiệm vụ giải trình (không tạo trùng).
- **Tiến độ** = đầu việc *bắt buộc* hoàn tất / đầu việc bắt buộc không hủy. Chưa có đầu việc bắt buộc → hiển thị “Chưa thiết lập”.
- **Mốc bảo vệ**: hiện mới có 25/10. Khi có thông tin chính thức: “Cập nhật mốc bảo vệ” → nhập năm, giờ, địa điểm → đánh dấu “Đã xác nhận” để bật đếm ngược. Thiếu năm thì không cho xác nhận.
- Lịch tập: thêm sự kiện thuộc dự án luận văn. Việc sau bảo vệ: thêm đầu việc giai đoạn “Sau bảo vệ”.

## 8. Tìm kiếm
Ô tìm kiếm trên header tìm trong tên, mô tả, số kí hiệu, cơ quan, nhãn, tên tệp, nhiệm vụ, email, sự kiện; gõ không dấu cũng được. Chưa tìm trong *nội dung* PDF/Word.

## 9. Nơi lưu dữ liệu
| Đường dẫn | Nội dung |
|---|---|
| `data/db/nmw.sqlite` | Cơ sở dữ liệu chính (không sửa bằng trình soạn thảo) |
| `data/files/YYYY/MM/att_….ext` | Tệp đính kèm, đặt tên theo ID; tên gốc lưu trong CSDL |
| `data/demo/` | Dữ liệu minh họa (tách riêng) |
| `data/restore-test/` | Bản diễn tập khôi phục |
| `data/_rollback/` | Dữ liệu cũ được giữ lại sau mỗi lần khôi phục |
| `data/run/server.json` | Cổng/PID máy chủ đang chạy (dùng để dừng đúng tiến trình) |
| `backups/NMW_YYYYMMDD_HHMMSS…/` | Gói sao lưu: `db.sqlite`, `files/`, `manifest.json` |

Di chuyển thư mục dự án khi máy chủ đã dừng; mọi đường dẫn đều tương đối nên không mất liên kết.

## 10. Sao lưu và khôi phục (SOP-04)
1. Chân trang → **Quản lí dữ liệu & sao lưu** → **Tạo bản sao lưu ngay**. Ứng dụng tạm khóa ghi, tạo snapshot SQLite nhất quán, chép tệp, ghi manifest (số bản ghi, SHA-256) và tự kiểm tra trước khi báo ĐẠT.
2. **Kiểm tra**: đối chiếu lại checksum, integrity_check, khóa ngoại, số bản ghi.
3. **Diễn tập**: chép gói vào `data/restore-test/…` và đối chiếu — không đụng dữ liệu thật.
4. **Khôi phục…**: gõ đúng câu xác nhận `KHOI PHUC <tên gói>`. Gói lỗi bị từ chối trước khi thay dữ liệu. Ứng dụng tự sao lưu hiện trạng (gói `…_truoc_khoi_phuc`) và giữ dữ liệu cũ ở `data/_rollback/<thời điểm>`; lỗi giữa chừng thì tự trả lại dữ liệu cũ.
5. Gói từ nơi khác: chép cả thư mục gói `NMW_…` vào `backups/`, rồi Kiểm tra → Diễn tập → Khôi phục.
6. Sao lưu cùng ổ chỉ chống lỗi thao tác: định kỳ chép thư mục gói đã kiểm tra sang ổ khác/USB do cô chọn. Gói chứa dữ liệu cá nhân — không đưa lên Git hay mạng.
7. Khi ứng dụng có migration mới, máy chủ tự sao lưu trước khi đổi cấu trúc (gói `…_truoc_migration_…`).

## 11. Dữ liệu minh họa
Quản lí dữ liệu → **Xem dữ liệu minh họa**: chuyển sang CSDL riêng có nhãn [Minh họa] và dải vàng trên đầu trang. **Thoát minh họa** để về dữ liệu thật; khởi động lại máy chủ luôn về dữ liệu thật.

## 12. Khắc phục sự cố
| Hiện tượng | Cách xử lí |
|---|---|
| Cửa sổ báo “Cần Node.js >= 22.13” | Cài Node LTS mới từ nodejs.org, mở lại |
| Trình duyệt báo “Không kết nối được máy chủ cục bộ” | Cửa sổ máy chủ đã đóng → nháy đúp lại `KHOI_DONG.bat`; trang tự thử lại mỗi 3 giây. Nếu vẫn lỗi: mở `data/run/server.log` và gửi nội dung cho người hỗ trợ |
| “Host không hợp lệ” | Mở bằng `http://127.0.0.1:<cổng>/` hoặc `http://localhost:<cổng>/` |
| Lưu báo lỗi | Đọc thông báo đỏ; nội dung đã nhập vẫn giữ, sửa rồi bấm Lưu lại |
| “Đang sao lưu… tạm khóa ghi” | Đợi vài giây rồi lưu lại |
| Tải tệp báo “Tệp không còn trong kho” | Tệp trong `data/files` bị xóa/di chuyển ngoài ứng dụng → khôi phục từ bản sao lưu |
| Lỗi quyền ghi | Đảm bảo thư mục dự án không ở nơi chỉ đọc; không mở cùng dữ liệu bằng hai máy chủ |
| Nghi dữ liệu hỏng | Dừng máy chủ, chép riêng thư mục `data/` ra chỗ khác, rồi khôi phục gói gần nhất đã Kiểm tra ĐẠT |

## 13. Lệnh cho người phát triển
| Lệnh | Tác dụng |
|---|---|
| `npm ci` | Cài phụ thuộc phát triển theo lockfile |
| `npm run build` | Typecheck + build giao diện vào `app/client/dist` |
| `npm run typecheck` | Kiểm tra kiểu client + server |
| `npm test` | 14 kiểm thử API trên CSDL tạm (không đụng `data/`) |
| `npm run serve` + `npm run dev` | Phát triển: Vite tại `http://127.0.0.1:5173` chuyển `/api` tới máy chủ 5178 |
| `python tests/ui_check.py <url> <thư mục ảnh>` | Kiểm tra trình duyệt (cần Playwright) — chỉ chạy trên máy chủ dùng dữ liệu thử |

## Nguyên tắc dùng dữ liệu
- Thêm bản mới của tài liệu trong mục phiên bản, tránh tạo nhiều bản ghi độc lập cùng nội dung.
- Link nguồn bên ngoài có thể cần mạng/quyền đăng nhập; tài liệu đính kèm cục bộ vẫn ở data.
- Link file trên máy cần đi qua chức năng nhập tệp; không dán file:// rồi kỳ vọng mọi trình duyệt mở được.
- Không đưa file cần giữ bí mật vào public hoặc Git.
- Backup cùng ổ chỉ giúp phục hồi lỗi thao tác; định kỳ chép bản sao sang ổ khác/thiết bị riêng theo lựa chọn của người dùng.
- Email ở V1 là ghi chú theo dõi, không phải hộp thư đồng bộ. Ứng dụng đóng thì không có thông báo nền.
- Chạy cục bộ không đồng nghĩa chống được người đang sử dụng tài khoản Windows của cô.
