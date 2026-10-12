// @ts-check
// Dữ liệu minh họa: chỉ ghi vào data/demo/db/demo.sqlite (CSDL riêng), mọi tiêu đề có nhãn [Minh họa].
import { createDocument } from './routes/documents.mjs';
import { createTask } from './routes/work.mjs';
import { addDays, mondayOf, newId, nowIso, todayVN, vnLocalToUtc } from './util.mjs';

/** @param {import('node:sqlite').DatabaseSync} db */
export function seedDemo(db) {
  const n = Number(/** @type {any} */ (db.prepare('SELECT COUNT(*) AS n FROM documents').get()).n);
  if (n > 0) return;
  const today = todayVN();
  const mon = mondayOf(today);
  const L = '[Minh họa] ';
  const lp = createDocument(db, {
    category: 'lesson', title: L + 'Bài 6 – Tế bào nhân sơ', subject: 'Sinh học', grade: '10', school_year: '2026-2027', tags: ['tế bào', 'minh họa'],
    lesson: { semester: 'HK1', class_label: '10A1', lesson_title: 'Tế bào nhân sơ', periods: 2, status: 'san_sang' },
  });
  createDocument(db, {
    category: 'lesson', title: L + 'Bài 10 – Trồng và chăm sóc rừng', subject: 'Công nghệ', grade: '12', school_year: '2026-2027', tech_branch: 'lam_nghiep',
    tags: ['lâm nghiệp', 'minh họa'], lesson: { semester: 'HK1', class_label: '12A7', status: 'dang_soan' },
  });
  const mat = createDocument(db, {
    category: 'material', title: L + 'Bộ câu hỏi trắc nghiệm tế bào', subject: 'Sinh học', grade: '10', material_type: 'cau_hoi', tags: ['tế bào', 'HSG', 'minh họa'], pinned: true,
  });
  createDocument(db, { category: 'material', title: L + 'Đề kiểm tra giữa kì – Thủy sản', subject: 'Công nghệ', grade: '12', material_type: 'de', tech_branch: 'thuy_san', tags: ['minh họa'] });
  db.prepare('INSERT INTO document_relations (document_id, related_document_id, created_at) VALUES (?, ?, ?)').run(lp.id, mat.id, nowIso());
  createDocument(db, {
    category: 'official', title: L + 'Công văn hướng dẫn nhiệm vụ năm học (ví dụ)', tags: ['minh họa'],
    official: { number: 'Số …/MH', issuer: 'Cơ quan minh họa', document_type: 'Công văn', field: 'Chuyên môn', action_note: 'Ví dụ: đọc và lập kế hoạch tổ' },
  });
  const draft = createDocument(db, { category: 'thesis', title: L + 'Bản thảo luận văn', material_type: 'ban_thao', tags: ['minh họa'] });
  createTask(db, { title: L + 'Hoàn thiện slide bảo vệ', due_kind: 'date', due_date: addDays(today, 3), priority: 'cao', project_id: 'prj_luan_van', phase: 'truoc_bao_ve', required_for_progress: true });
  createTask(db, { title: L + 'Nộp hồ sơ bảo vệ', due_kind: 'date', due_date: addDays(today, 5), priority: 'cao', project_id: 'prj_luan_van', phase: 'truoc_bao_ve', required_for_progress: true, status: 'hoan_tat' });
  createTask(db, { title: L + 'Chấm bài kiểm tra 10A1', due_kind: 'datetime', due_date: addDays(today, 1), due_time: '17:00', priority: 'trung_binh' });
  createTask(db, { title: L + 'Cập nhật sổ điểm', due_kind: 'date', due_date: addDays(today, -1), priority: 'thap' });
  const now = nowIso();
  db.prepare(`INSERT INTO events (id, title, all_day, start_at, end_at, location, document_id, search_text, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?, ?, '', ?, ?)`)
    .run(newId('evt'), L + 'Dạy 10A1 – Tế bào nhân sơ', vnLocalToUtc(addDays(mon, 1), '07:00'), vnLocalToUtc(addDays(mon, 1), '07:45'), 'Phòng 201', lp.id, now, now);
  db.prepare(`INSERT INTO events (id, title, all_day, start_date, end_date, project_id, search_text, created_at, updated_at) VALUES (?, ?, 1, ?, ?, 'prj_luan_van', '', ?, ?)`)
    .run(newId('evt'), L + 'Tập dượt bảo vệ', addDays(mon, 3), addDays(mon, 4), now, now);
  db.prepare(`INSERT INTO emails (id, subject, sender, received_date, note, status, due_date, search_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'chua_xu_li', ?, '', ?, ?)`)
    .run(newId('mail'), L + 'Thông báo nộp kế hoạch tổ', 'Người gửi minh họa', today, 'Ví dụ ghi chú ngắn', addDays(today, 4), now, now);
  db.prepare(`INSERT INTO feedback (id, project_id, document_version_id, reviewer, content, status, created_at, updated_at) VALUES (?, 'prj_luan_van', ?, ?, ?, 'moi', ?, ?)`)
    .run(newId('fb'), draft.current_version_id, 'Người phản biện (minh họa)', 'Ví dụ: làm rõ cơ sở lí luận chương 1', now, now);
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('is_demo', '1', ?)").run(now);
}
