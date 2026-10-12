// Định dạng Việt Nam (dd/mm/yyyy), múi giờ Asia/Ho_Chi_Minh, nhãn trạng thái.
export const TZ = 'Asia/Ho_Chi_Minh';

export function todayVN(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'YYYY-MM-DD' → 'dd/mm/yyyy' (không đi qua Date để tránh lệch ngày). */
export function fmtDate(ymd?: string | null): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Instant UTC → 'dd/mm/yyyy HH:MM' giờ VN. */
export function fmtInstant(iso?: string | null): string {
  if (!iso) return '';
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(ymd: string): string {
  const dow = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -dow);
}

export const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
export const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function weekdayName(ymd: string): string {
  return WEEKDAYS[(new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7];
}

export function fmtDue(t: { due_date?: string | null; due_local?: { date: string; time: string | null } | null }): string {
  if (!t.due_local) return 'Chưa đặt hạn';
  return t.due_local.time ? `${fmtDate(t.due_local.date)} lúc ${t.due_local.time}` : fmtDate(t.due_local.date);
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const L = {
  category: { lesson: 'Kế hoạch bài dạy', material: 'Tài liệu chuyên môn', official: 'Văn bản quản lí', thesis: 'Hồ sơ luận văn' } as Record<string, string>,
  lessonStatus: { dang_soan: 'Đang soạn', san_sang: 'Sẵn sàng', da_day: 'Đã dạy', can_dieu_chinh: 'Cần điều chỉnh' } as Record<string, string>,
  taskStatus: { chua_lam: 'Chưa làm', dang_lam: 'Đang làm', cho_phan_hoi: 'Chờ phản hồi', hoan_tat: 'Hoàn tất', huy: 'Hủy' } as Record<string, string>,
  priority: { cao: 'Ưu tiên cao', trung_binh: 'Ưu tiên trung bình', thap: 'Ưu tiên thấp' } as Record<string, string>,
  emailStatus: { chua_xu_li: 'Chưa xử lí', dang_xu_li: 'Đang xử lí', cho_phan_hoi: 'Chờ phản hồi', hoan_tat: 'Hoàn tất' } as Record<string, string>,
  validity: {
    chua_kiem_tra: 'Chưa kiểm tra hiệu lực',
    con_hieu_luc: 'Còn hiệu lực (đã kiểm tra)',
    het_hieu_luc: 'Hết hiệu lực (đã kiểm tra)',
    khong_ap_dung: 'Không áp dụng',
  } as Record<string, string>,
  materialType: { tai_lieu: 'Tài liệu', cau_hoi: 'Câu hỏi', de: 'Đề', dap_an: 'Đáp án', thuc_hanh: 'Thực hành', hsg: 'HSG' } as Record<string, string>,
  thesisType: { ban_thao: 'Bản thảo', ho_so: 'Hồ sơ', slide: 'Slide', cau_hoi_bao_ve: 'Câu hỏi bảo vệ', giai_trinh: 'Giải trình', khac: 'Khác' } as Record<string, string>,
  tech: { trong_trot: 'Trồng trọt', chan_nuoi: 'Chăn nuôi', lam_nghiep: 'Lâm nghiệp', thuy_san: 'Thủy sản' } as Record<string, string>,
  feedback: { moi: 'Mới', dang_giai_trinh: 'Đang giải trình', da_giai_trinh: 'Đã giải trình', khong_tiep_thu: 'Không tiếp thu (có lí do)' } as Record<string, string>,
  phase: { truoc_bao_ve: 'Trước bảo vệ', sau_bao_ve: 'Sau bảo vệ' } as Record<string, string>,
};

export const CATEGORY_PATH: Record<string, string> = {
  lesson: '/ke-hoach-bai-day',
  material: '/chuyen-mon',
  official: '/van-ban',
  thesis: '/luan-van',
};

export function isoYearNow(): number {
  return Number(todayVN().slice(0, 4));
}

/** Năm học đang dùng (mặc định trong biểu mẫu và hiển thị trên trang chủ). */
export const CURRENT_SCHOOL_YEAR = '2026-2027';

export function schoolYears(): string[] {
  return [CURRENT_SCHOOL_YEAR, '2027-2028', '2025-2026', '2024-2025'];
}

/** Đường dẫn trên máy (D:\\…, \\\\máy\\…) hay link web. */
export function isLocalPath(s?: string | null): boolean {
  return !!s && (/^[a-zA-Z]:[\\/]/.test(s) || /^\\\\[^\\/]+[\\/]/.test(s));
}
