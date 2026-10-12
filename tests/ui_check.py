"""Kiểm tra giao diện bằng trình duyệt (Playwright + Chromium). Tùy chọn – cần: pip install playwright.
Chạy khi máy chủ đang chạy trên dữ liệu THỬ (không dùng dữ liệu thật):
    python tests/ui_check.py http://127.0.0.1:5391 reports/anh
"""
import sys, os
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5178'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'reports/anh'
os.makedirs(OUT, exist_ok=True)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' – {detail}' if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(BASE + '/')
    pg.wait_for_selector('text=Việc ưu tiên')
    # Màn hình 1440x900: thấy dải ưu tiên và phần đầu hai khối mà không cuộn
    blk = pg.locator('#blk-teach').bounding_box(); blk2 = pg.locator('#blk-work').bounding_box()
    check('1440x900: thấy tiêu đề hai khối chính không cần cuộn', blk['y'] + blk['height'] < 900 and blk2['y'] + blk2['height'] < 900, f"y={blk['y']:.0f}")
    pg.screenshot(path=f'{OUT}/trang-chu-1440.png')

    # Bàn phím: Tab tới "Thêm mới", Enter mở menu, chọn "Kế hoạch bài dạy"
    pg.keyboard.press('Tab')
    check('Tab đầu tiên vào link bỏ qua nội dung', pg.evaluate('document.activeElement.className') == 'skip-link')
    btn = pg.get_by_role('button', name='Thêm mới')
    btn.focus(); pg.keyboard.press('Enter')
    pg.get_by_role('button', name='Kế hoạch bài dạy').focus(); pg.keyboard.press('Enter')
    dlg = pg.get_by_role('dialog')
    expect(dlg).to_be_visible()
    check('Hộp thoại mở và focus vào ô đầu tiên', pg.evaluate("document.activeElement.tagName") == 'INPUT')
    # Lưu khi thiếu tên → báo lỗi, giữ nội dung đã nhập
    pg.get_by_label('Lớp').fill('10A1')
    pg.get_by_role('button', name='Lưu', exact=True).click()
    expect(pg.locator('.form-error')).to_be_visible()
    check('Lỗi lưu: hộp thoại còn mở, nội dung giữ nguyên', pg.get_by_label('Lớp').input_value() == '10A1')
    pg.keyboard.press('Escape')
    expect(dlg).to_be_hidden()
    check('Esc đóng hộp thoại, focus trở lại', pg.evaluate("document.activeElement !== document.body"))
    # Thêm thật bằng bàn phím
    btn.click(); pg.get_by_role('button', name='Kế hoạch bài dạy').click()
    pg.keyboard.type('Bài 6 – Tế bào nhân sơ (kiểm thử)')
    pg.get_by_label('Lớp').fill('10A1')
    pg.get_by_label('Nhãn (phân tách bằng dấu phẩy)').fill('tế bào, HSG')
    pg.get_by_role('button', name='Lưu', exact=True).click()
    pg.wait_for_url('**/tai-lieu/**')
    check('Lưu kế hoạch → mở trang chi tiết có URL ID ổn định', '/tai-lieu/doc_' in pg.url)
    detail_url = pg.url
    # Tải tệp qua giao diện
    sample = os.path.join(OUT, '_mau.pdf')
    open(sample, 'wb').write(b'%PDF-1.4\n% mau kiem thu\n%%EOF\n')
    pg.set_input_files('#up-file', sample)
    pg.get_by_role('button', name='Tải lên').click()
    expect(pg.locator('.att-list a')).to_have_text('_mau.pdf')
    check('Tải tệp lên qua giao diện, hiện trong bản hiện hành', True)
    pg.reload(); pg.wait_for_selector('.att-list a')
    check('Refresh: URL chi tiết mở lại được, tệp còn', pg.url == detail_url)
    with pg.expect_download() as dl:
        pg.locator('.att-list a').click()
    check('Tải tệp xuống', dl.value.suggested_filename == '_mau.pdf')
    pg.screenshot(path=f'{OUT}/chi-tiet-tai-lieu-1440.png', full_page=True)

    # Email → nhiệm vụ (không trùng)
    pg.goto(BASE + '/email-quan-trong')
    pg.get_by_role('button', name='Thêm email', exact=True).click()
    pg.get_by_role('dialog').get_by_label('Tiêu đề').fill('Nộp kế hoạch tổ (kiểm thử)')
    pg.get_by_role('button', name='Lưu', exact=True).click()
    pg.get_by_role('button', name='Tạo nhiệm vụ', exact=True).click()
    pg.wait_for_url('**/nhiem-vu/**'); first = pg.url
    pg.goto(BASE + '/email-quan-trong')
    pg.get_by_role('button', name='Mở nhiệm vụ').click()
    pg.wait_for_url('**/nhiem-vu/**')
    check('Email: bấm lại mở đúng nhiệm vụ cũ, không tạo trùng', pg.url == first)

    # Lịch tuần ↔ tháng
    pg.goto(BASE + '/lich-cong-viec')
    pg.get_by_role('button', name='Thêm sự kiện', exact=True).click()
    pg.get_by_role('dialog').get_by_label('Tên sự kiện').fill('Họp tổ (kiểm thử)')
    pg.get_by_role('button', name='Lưu', exact=True).click()
    expect(pg.locator('.cal-week').get_by_text('Họp tổ (kiểm thử)')).to_be_visible()
    pg.get_by_role('button', name='Tháng').click()
    expect(pg.locator('.cal-month').get_by_text('Họp tổ (kiểm thử)')).to_be_visible()
    check('Sự kiện thêm ở tuần hiện ở tháng', True)
    pg.screenshot(path=f'{OUT}/lich-thang-1440.png', full_page=True)

    # Sao lưu qua giao diện
    pg.goto(BASE + '/cai-dat')
    pg.get_by_role('button', name='Tạo bản sao lưu ngay').click()
    expect(pg.locator('.report-ok')).to_be_visible(timeout=15000)
    pg.get_by_role('button', name='Diễn tập').first.click()
    expect(pg.locator('.report-ok')).to_contain_text('Diễn tập')
    check('Sao lưu + diễn tập khôi phục qua giao diện: ĐẠT', True)

    # Responsive 390px: không tràn ngang trên mọi trang
    m = b.new_page(viewport={'width': 390, 'height': 844})
    for path in ['/', '/ke-hoach-bai-day', '/chuyen-mon', '/van-ban', '/lich-cong-viec', '/lich-cong-viec?view=thang', '/email-quan-trong', '/luan-van', '/cai-dat', detail_url.replace(BASE, '')]:
        m.goto(BASE + path); m.wait_for_timeout(400)
        sw = m.evaluate('document.documentElement.scrollWidth')
        check(f'390px không tràn ngang: {path}', sw <= 390, f'scrollWidth={sw}')
    m.goto(BASE + '/'); m.wait_for_timeout(400)
    m.screenshot(path=f'{OUT}/trang-chu-390.png', full_page=True)
    m.goto(BASE + '/lich-cong-viec?view=thang'); m.wait_for_timeout(400)
    m.screenshot(path=f'{OUT}/lich-thang-390.png', full_page=True)
    errors = [e for e in errors if 'status of 400' not in e]  # 400 là phản hồi chủ động khi thử lưu thiếu tên
    check('Không có lỗi JavaScript trên trang', not errors, '; '.join(errors[:3]))
    b.close()

fails = [r for r in results if not r[1]]
print(f'\nTổng: {len(results)} kiểm tra, {len(results) - len(fails)} PASS, {len(fails)} FAIL')
sys.exit(1 if fails else 0)
