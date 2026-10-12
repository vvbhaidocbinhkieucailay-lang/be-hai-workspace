# Kiểm thử

- `npm test` → `tests/api.test.mjs` (14 kiểm thử, máy chủ thật trên thư mục tạm qua `NMW_ROOT`; không đụng `data/` thật): dữ liệu rỗng, ranh giới cục bộ, tài liệu đa nhãn, kế hoạch, văn bản, tệp an toàn, lịch tuần/tháng + múi giờ, nhiệm vụ, email → nhiệm vụ, luận văn, lỗi lưu, dữ liệu minh họa, lưu bền vững sau restart, sao lưu/khôi phục + gói hỏng.
- `python tests/ui_check.py <url> <thư mục ảnh>` → kiểm tra trình duyệt (Playwright + Chromium): 1440/390px, bàn phím, hộp thoại, upload/download, email, lịch, sao lưu. Chỉ chạy với máy chủ dùng dữ liệu thử.
- Kết quả gần nhất: 06/10/2026 – 14/14 và 23/23 PASS (xem `reports/2026-10-06_nghiem-thu-v1.md`). Không ghi PASS khi chưa chạy.
