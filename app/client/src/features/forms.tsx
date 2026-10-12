// Biểu mẫu thêm/sửa. Khi lưu lỗi: giữ nguyên nội dung, hiển thị lỗi theo trường; nút lưu báo "Đang lưu…".
import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, post, put, useApi } from '../lib/api';
import { CURRENT_SCHOOL_YEAR, L, schoolYears, todayVN } from '../lib/format';
import { Checkbox, FormError, Select, TextArea, TextInput } from '../components/ui';

function useForm<T extends Record<string, any>>(initial: T) {
  const [v, setV] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof T | string, val: any) => setV((o) => ({ ...o, [k]: val }));
  async function run(fn: () => Promise<any>) {
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      return await fn();
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setErrors(err.fields ?? {});
      return undefined;
    } finally {
      setSaving(false);
    }
  }
  return { v, set, setV, errors, error, saving, run };
}

function Actions({ saving, onCancel, label = 'Lưu' }: { saving: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="form-actions">
      <button type="button" className="btn" onClick={onCancel} disabled={saving}>
        Hủy
      </button>
      <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
        {saving ? 'Đang lưu…' : label}
      </button>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

const opts = (o: Record<string, string>) => Object.entries(o) as [string, string][];

// ---------------- Tài liệu (kế hoạch / chuyên môn / văn bản / luận văn) ----------------

export function DocumentForm({ category, doc, preset, onDone, onCancel }: { category: string; doc?: any; preset?: Record<string, any>; onDone: (d: any) => void; onCancel: () => void }) {
  const f = useForm({
    title: doc?.title ?? '',
    summary: doc?.summary ?? '',
    subject: doc?.subject ?? preset?.subject ?? (category === 'official' || category === 'thesis' ? '' : 'Sinh học'),
    grade: doc?.grade ?? '',
    school_year: doc?.school_year ?? (category === 'lesson' || category === 'material' ? CURRENT_SCHOOL_YEAR : ''),
    material_type: doc?.material_type ?? preset?.material_type ?? '',
    tech_branch: doc?.tech_branch ?? '',
    source_url: doc?.source_url ?? '',
    tags: (doc?.tags ?? []).map((t: any) => t.label).join(', '),
    pinned: false,
    lesson: { semester: '', class_label: '', lesson_title: '', periods: '', status: 'dang_soan', reflection: '', ...(doc?.lesson ?? {}) },
    official: { number: '', issuer: '', document_type: '', field: '', issued_date: '', validity_status: 'chua_kiem_tra', validity_source: '', checked_date: '', action_note: '', ...(doc?.official ?? {}) },
  });
  const { v, set } = f;
  const setL = (k: string, val: any) => set('lesson', { ...v.lesson, [k]: val });
  const setO = (k: string, val: any) => set('official', { ...v.official, [k]: val });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...v, category, tags: v.tags, lesson: { ...v.lesson, periods: v.lesson.periods === '' ? null : Number(v.lesson.periods) } };
    const r = await f.run(() => (doc ? put(`/api/documents/${doc.id}`, body) : post('/api/documents', body)));
    if (r) onDone(r);
  };
  const isOfficial = category === 'official';
  const isThesis = category === 'thesis';
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      <TextInput label={category === 'lesson' ? 'Tên kế hoạch bài dạy' : isOfficial ? 'Trích yếu / tên văn bản' : 'Tên tài liệu'} required value={v.title} onChange={(e) => set('title', e.target.value)} error={f.errors.title} maxLength={300} />
      {!isOfficial && !isThesis && (
        <Grid>
          <Select label="Môn" value={v.subject} onChange={(e) => set('subject', e.target.value)} options={[['Sinh học', 'Sinh học'], ['Công nghệ', 'Công nghệ']]} />
          <Select label="Khối" value={v.grade} onChange={(e) => set('grade', e.target.value)} options={[['10', 'Khối 10'], ['11', 'Khối 11'], ['12', 'Khối 12'], ['Khác', 'Khác']]} />
          <Select label="Năm học" value={v.school_year} onChange={(e) => set('school_year', e.target.value)} options={schoolYears().map((y) => [y, y])} error={f.errors.school_year} />
          {v.subject === 'Công nghệ' && <Select label="Phân môn Công nghệ" value={v.tech_branch} onChange={(e) => set('tech_branch', e.target.value)} options={opts(L.tech)} />}
          {category === 'material' && <Select label="Dạng học liệu" value={v.material_type} onChange={(e) => set('material_type', e.target.value)} options={opts(L.materialType)} />}
        </Grid>
      )}
      {isThesis && <Select label="Loại hồ sơ luận văn" value={v.material_type} onChange={(e) => set('material_type', e.target.value)} options={opts(L.thesisType)} />}
      {category === 'lesson' && (
        <fieldset>
          <legend>Thông tin bài dạy</legend>
          <Grid>
            <Select label="Học kì" value={v.lesson.semester ?? ''} onChange={(e) => setL('semester', e.target.value)} options={[['HK1', 'Học kì 1'], ['HK2', 'Học kì 2']]} />
            <TextInput label="Lớp" value={v.lesson.class_label ?? ''} onChange={(e) => setL('class_label', e.target.value)} placeholder="vd. 10A1" />
            <TextInput label="Tên bài" value={v.lesson.lesson_title ?? ''} onChange={(e) => setL('lesson_title', e.target.value)} />
            <TextInput label="Số tiết" type="number" min={1} max={50} value={v.lesson.periods ?? ''} onChange={(e) => setL('periods', e.target.value)} error={f.errors.periods} />
            <Select label="Trạng thái" value={v.lesson.status} empty={null} onChange={(e) => setL('status', e.target.value)} options={opts(L.lessonStatus)} />
          </Grid>
          <TextArea label="Rút kinh nghiệm / điều chỉnh" value={v.lesson.reflection ?? ''} onChange={(e) => setL('reflection', e.target.value)} />
        </fieldset>
      )}
      {isOfficial && (
        <fieldset>
          <legend>Thông tin văn bản</legend>
          <Grid>
            <TextInput label="Số kí hiệu" value={v.official.number ?? ''} onChange={(e) => setO('number', e.target.value)} />
            <TextInput label="Cơ quan ban hành" value={v.official.issuer ?? ''} onChange={(e) => setO('issuer', e.target.value)} />
            <TextInput label="Ngày ban hành" type="date" value={v.official.issued_date ?? ''} onChange={(e) => setO('issued_date', e.target.value)} error={f.errors.issued_date} />
            <TextInput label="Loại văn bản" value={v.official.document_type ?? ''} onChange={(e) => setO('document_type', e.target.value)} placeholder="Công văn, Thông tư, Kế hoạch…" />
            <TextInput label="Lĩnh vực" value={v.official.field ?? ''} onChange={(e) => setO('field', e.target.value)} />
          </Grid>
          <TextArea label="Việc cần làm theo văn bản" value={v.official.action_note ?? ''} onChange={(e) => setO('action_note', e.target.value)} />
          <Grid>
            <Select label="Hiệu lực" value={v.official.validity_status} empty={null} onChange={(e) => setO('validity_status', e.target.value)} options={opts(L.validity)} error={f.errors.validity_status}
              hint="Mặc định chưa kiểm tra. Chỉ chọn còn/hết hiệu lực khi đã tự kiểm tra ở nguồn chính thức." />
            <TextInput label="Nguồn kiểm tra hiệu lực (đường dẫn hoặc link)" value={v.official.validity_source ?? ''} onChange={(e) => setO('validity_source', e.target.value)} error={f.errors.validity_source} placeholder="D:\… hoặc https://…" />
            <TextInput label="Ngày kiểm tra" type="date" value={v.official.checked_date ?? ''} onChange={(e) => setO('checked_date', e.target.value)} error={f.errors.checked_date} />
          </Grid>
        </fieldset>
      )}
      <TextArea label={isOfficial ? 'Tóm tắt cá nhân (diễn giải riêng, không phải nội dung chính thức)' : 'Mô tả / ghi chú'} value={v.summary} onChange={(e) => set('summary', e.target.value)} />
      <Grid>
        <TextInput label={isOfficial ? 'Nguồn chính thức (đường dẫn thư mục/tệp hoặc link)' : 'Đường dẫn thư mục/tệp (hoặc link)'} value={v.source_url} onChange={(e) => set('source_url', e.target.value)} error={f.errors.source_url}
          placeholder="D:\2026-2027\Giao an\Sinh 10" hint="Dán đường dẫn từ thanh địa chỉ File Explorer; mở lại bằng nút “Mở thư mục”." />
        <TextInput label="Nhãn (phân tách bằng dấu phẩy)" value={v.tags} onChange={(e) => set('tags', e.target.value)} error={f.errors.tags} placeholder="vd. tế bào, HSG, 10A1" />
      </Grid>
      {!doc && <Checkbox label="Ghim lên trang tổng quan" checked={v.pinned} onChange={(e) => set('pinned', e.target.checked)} />}
      {!doc && <p className="muted small">Sau khi lưu, mở tài liệu để tải tệp bản gốc lên và quản lí phiên bản.</p>}
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}

// ---------------- Nhiệm vụ ----------------

export function TaskForm({ task, preset, onDone, onCancel }: { task?: any; preset?: Record<string, any>; onDone: (t: any) => void; onCancel: () => void }) {
  const f = useForm({
    title: task?.title ?? preset?.title ?? '',
    notes: task?.notes ?? '',
    due_kind: task ? (task.due_at ? 'datetime' : task.due_date ? 'date' : 'none') : preset?.due_date ? 'date' : 'date',
    due_date: task?.due_local?.date ?? preset?.due_date ?? todayVN(),
    due_time: task?.due_local?.time ?? '',
    priority: task?.priority ?? 'trung_binh',
    status: task?.status ?? 'chua_lam',
    project_id: task?.project_id ?? preset?.project_id ?? '',
    phase: task?.phase ?? preset?.phase ?? '',
    required_for_progress: task?.required_for_progress ?? !!preset?.required_for_progress,
    document_ids: task ? task.documents.map((d: any) => d.id) : preset?.document_ids ?? [],
  });
  const { v, set } = f;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await f.run(() => (task ? put(`/api/tasks/${task.id}`, v) : post('/api/tasks', v)));
    if (r) onDone(r);
  };
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      <TextInput label="Tên việc" required value={v.title} onChange={(e) => set('title', e.target.value)} error={f.errors.title} maxLength={300} />
      <Grid>
        <Select label="Kiểu hạn" value={v.due_kind} empty={null} onChange={(e) => set('due_kind', e.target.value)}
          options={[['date', 'Cả ngày'], ['datetime', 'Có giờ cụ thể'], ['none', 'Chưa đặt hạn']]} />
        {v.due_kind !== 'none' && <TextInput label="Ngày hạn" type="date" value={v.due_date} onChange={(e) => set('due_date', e.target.value)} error={f.errors.due_date} />}
        {v.due_kind === 'datetime' && <TextInput label="Giờ (giờ Việt Nam)" type="time" value={v.due_time} onChange={(e) => set('due_time', e.target.value)} error={f.errors.due_time} />}
        <Select label="Ưu tiên" value={v.priority} empty={null} onChange={(e) => set('priority', e.target.value)} options={[['cao', 'Cao'], ['trung_binh', 'Trung bình'], ['thap', 'Thấp']]} />
        <Select label="Trạng thái" value={v.status} empty={null} onChange={(e) => set('status', e.target.value)} options={opts(L.taskStatus)} />
      </Grid>
      <TextArea label="Ghi chú" value={v.notes} onChange={(e) => set('notes', e.target.value)} />
      <fieldset>
        <legend>Luận văn (nếu có)</legend>
        <Grid>
          <Select label="Thuộc dự án" value={v.project_id} onChange={(e) => set('project_id', e.target.value)} options={[['prj_luan_van', 'Luận văn thạc sĩ']]} empty="Không thuộc dự án" />
          {v.project_id && <Select label="Giai đoạn" value={v.phase} onChange={(e) => set('phase', e.target.value)} options={opts(L.phase)} />}
        </Grid>
        {v.project_id && (
          <Checkbox label="Đầu việc bắt buộc (tính vào tiến độ luận văn)" checked={v.required_for_progress} onChange={(e) => set('required_for_progress', e.target.checked)} />
        )}
      </fieldset>
      {v.document_ids.length > 0 && <p className="muted small">Liên kết với {v.document_ids.length} tài liệu (chỉnh trong trang chi tiết).</p>}
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}

// ---------------- Sự kiện lịch ----------------

export function EventForm({ event, preset, onDone, onCancel }: { event?: any; preset?: Record<string, any>; onDone: (e: any) => void; onCancel: () => void }) {
  const f = useForm({
    title: event?.title ?? preset?.title ?? '',
    all_day: event ? event.all_day : !!preset?.all_day,
    start_date: event?.start_local?.date ?? preset?.start_date ?? todayVN(),
    end_date: event?.end_local?.date ?? preset?.start_date ?? '',
    start_time: event?.start_local?.time ?? '07:00',
    end_time: event?.end_local?.time ?? '',
    location: event?.location ?? '',
    notes: event?.notes ?? '',
    project_id: event?.project_id ?? preset?.project_id ?? '',
    document_id: event?.document_id ?? preset?.document_id ?? '',
    linked_task_id: event?.linked_task_id ?? preset?.linked_task_id ?? '',
  });
  const { v, set } = f;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await f.run(() => (event ? put(`/api/events/${event.id}`, v) : post('/api/events', v)));
    if (r) onDone(r);
  };
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      <TextInput label="Tên sự kiện" required value={v.title} onChange={(e) => set('title', e.target.value)} error={f.errors.title} />
      <Checkbox label="Sự kiện cả ngày" checked={v.all_day} onChange={(e) => set('all_day', e.target.checked)} />
      <Grid>
        <TextInput label="Ngày bắt đầu" type="date" required value={v.start_date} onChange={(e) => set('start_date', e.target.value)} error={f.errors.start_date} />
        {!v.all_day && <TextInput label="Giờ bắt đầu" type="time" value={v.start_time} onChange={(e) => set('start_time', e.target.value)} error={f.errors.start_time} />}
        <TextInput label="Ngày kết thúc" type="date" value={v.end_date} onChange={(e) => set('end_date', e.target.value)} error={f.errors.end_date} hint="Để trống nếu cùng ngày" />
        {!v.all_day && <TextInput label="Giờ kết thúc" type="time" value={v.end_time} onChange={(e) => set('end_time', e.target.value)} error={f.errors.end_time} />}
      </Grid>
      <p className="muted small">Giờ tính theo giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).</p>
      <TextInput label="Địa điểm" value={v.location} onChange={(e) => set('location', e.target.value)} />
      <TextArea label="Ghi chú" value={v.notes} onChange={(e) => set('notes', e.target.value)} />
      <Select label="Thuộc dự án" value={v.project_id} onChange={(e) => set('project_id', e.target.value)} options={[['prj_luan_van', 'Luận văn thạc sĩ (lịch tập, bảo vệ…)']]} empty="Không thuộc dự án" />
      {v.document_id && <p className="muted small">Gắn với một tài liệu/kế hoạch bài dạy.</p>}
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}

// ---------------- Email quan trọng ----------------

export function EmailForm({ email, onDone, onCancel }: { email?: any; onDone: (e: any) => void; onCancel: () => void }) {
  const f = useForm({
    subject: email?.subject ?? '',
    sender: email?.sender ?? '',
    received_date: email?.received_date ?? todayVN(),
    note: email?.note ?? '',
    source_url: email?.source_url ?? '',
    due_date: email?.due_date ?? '',
    status: email?.status ?? 'chua_xu_li',
  });
  const { v, set } = f;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await f.run(() => (email ? put(`/api/emails/${email.id}`, v) : post('/api/emails', v)));
    if (r) onDone(r);
  };
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      <p className="muted small">Nhập tay để theo dõi. Ứng dụng không đọc hay gửi thư.</p>
      <TextInput label="Tiêu đề" required value={v.subject} onChange={(e) => set('subject', e.target.value)} error={f.errors.subject} />
      <Grid>
        <TextInput label="Người gửi" value={v.sender} onChange={(e) => set('sender', e.target.value)} />
        <TextInput label="Ngày nhận" type="date" value={v.received_date} onChange={(e) => set('received_date', e.target.value)} error={f.errors.received_date} />
        <TextInput label="Hạn xử lí" type="date" value={v.due_date} onChange={(e) => set('due_date', e.target.value)} error={f.errors.due_date} />
        <Select label="Trạng thái" value={v.status} empty={null} onChange={(e) => set('status', e.target.value)} options={opts(L.emailStatus)} />
      </Grid>
      <TextArea label="Ghi chú ngắn" value={v.note} onChange={(e) => set('note', e.target.value)} hint="Chỉ ghi điều cần theo dõi; không dán toàn văn thư hay mật khẩu." />
      <TextInput label="Đường dẫn thư mục lưu thư/tệp đính kèm (hoặc link thư gốc)" value={v.source_url} onChange={(e) => set('source_url', e.target.value)} error={f.errors.source_url} placeholder="D:\2026-2027\Email\Ke hoach to" />
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}

// ---------------- Góp ý luận văn ----------------

export function FeedbackForm({ projectId, item, onDone, onCancel }: { projectId: string; item?: any; onDone: (x: any) => void; onCancel: () => void }) {
  const { data } = useApi<{ items: any[] }>(`/api/documents?category=thesis&project_id=${projectId}`);
  const f = useForm({
    document_version_id: item?.document_version_id ?? '',
    reviewer: item?.reviewer ?? '',
    section_ref: item?.section_ref ?? '',
    content: item?.content ?? '',
    response_note: item?.response_note ?? '',
    status: item?.status ?? 'moi',
  });
  const { v, set } = f;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await f.run(() => (item ? put(`/api/feedback/${item.id}`, v) : post('/api/feedback', { ...v, project_id: projectId })));
    if (r) onDone(r);
  };
  const versionOptions: [string, string][] = (data?.items ?? []).filter((d) => d.current_version_id).map((d) => [d.current_version_id, `${d.title} – ${d.current_version_label ?? 'bản hiện hành'}`]);
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      {item ? (
        <p className="muted small">Góp ý giữ gắn với phiên bản đã được góp ý, không tự chuyển sang bản mới.</p>
      ) : (
        <Select label="Góp ý cho bản (bản hiện hành của tài liệu)" value={v.document_version_id} onChange={(e) => set('document_version_id', e.target.value)} options={versionOptions} empty="— Không gắn bản cụ thể —" />
      )}
      <Grid>
        <TextInput label="Người góp ý" value={v.reviewer} onChange={(e) => set('reviewer', e.target.value)} />
        <TextInput label="Vị trí (chương/mục/trang)" value={v.section_ref} onChange={(e) => set('section_ref', e.target.value)} />
      </Grid>
      <TextArea label="Nội dung góp ý" required value={v.content} onChange={(e) => set('content', e.target.value)} error={f.errors.content} />
      <TextArea label="Giải trình / cách xử lí" value={v.response_note} onChange={(e) => set('response_note', e.target.value)} />
      <Select label="Trạng thái" value={v.status} empty={null} onChange={(e) => set('status', e.target.value)} options={opts(L.feedback)} />
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}

// ---------------- Mốc bảo vệ luận văn ----------------

export function ProjectForm({ project, onDone, onCancel }: { project: any; onDone: (p: any) => void; onCancel: () => void }) {
  const f = useForm({
    name: project.name ?? '',
    notes: project.notes ?? '',
    defense_day: project.defense_day ?? '',
    defense_month: project.defense_month ?? '',
    defense_year: project.defense_year ?? '',
    defense_time: project.defense_time ?? '',
    defense_location: project.defense_location ?? '',
    date_confirmed: !!project.date_confirmed,
  });
  const { v, set } = f;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await f.run(() => put(`/api/projects/${project.id}`, v));
    if (r) onDone(r);
  };
  return (
    <form onSubmit={submit} noValidate>
      <FormError message={f.error} />
      <TextInput label="Tên dự án" required value={v.name} onChange={(e) => set('name', e.target.value)} error={f.errors.name} />
      <Grid>
        <TextInput label="Ngày" type="number" min={1} max={31} value={v.defense_day} onChange={(e) => set('defense_day', e.target.value)} error={f.errors.defense_day} />
        <TextInput label="Tháng" type="number" min={1} max={12} value={v.defense_month} onChange={(e) => set('defense_month', e.target.value)} error={f.errors.defense_month} />
        <TextInput label="Năm" type="number" min={2000} max={2100} value={v.defense_year} onChange={(e) => set('defense_year', e.target.value)} hint="Để trống nếu chưa xác nhận" error={f.errors.defense_year} />
        <TextInput label="Giờ" type="time" value={v.defense_time} onChange={(e) => set('defense_time', e.target.value)} error={f.errors.defense_time} />
      </Grid>
      <TextInput label="Địa điểm" value={v.defense_location} onChange={(e) => set('defense_location', e.target.value)} />
      <Checkbox label="Đã xác nhận chính thức ngày bảo vệ (cần đủ ngày/tháng/năm) – bật đếm ngược" checked={v.date_confirmed} onChange={(e) => set('date_confirmed', e.target.checked)} />
      {f.errors.date_confirmed && <p className="err">{f.errors.date_confirmed}</p>}
      <TextArea label="Ghi chú" value={v.notes} onChange={(e) => set('notes', e.target.value)} />
      <Actions saving={f.saving} onCancel={onCancel} />
    </form>
  );
}
