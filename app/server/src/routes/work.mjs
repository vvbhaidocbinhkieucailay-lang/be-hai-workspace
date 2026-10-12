// @ts-check
// Nhiệm vụ, lịch, email quan trọng, dự án luận văn và góp ý. Một nhiệm vụ là một bản ghi, được tham chiếu từ nhiều màn hình.
import { created, route } from '../http.mjs';
import {
  HttpError, addDays, bool, daysBetween, hhmm, idList, int, newId, norm, nowIso, oneOf, str, todayVN, tx, url, utcToVn, vnLocalToUtc, ymd,
} from '../util.mjs';

export const TASK_STATUS = /** @type {const} */ (['chua_lam', 'dang_lam', 'cho_phan_hoi', 'hoan_tat', 'huy']);
export const PRIORITY = /** @type {const} */ (['cao', 'trung_binh', 'thap']);
export const EMAIL_STATUS = /** @type {const} */ (['chua_xu_li', 'dang_xu_li', 'cho_phan_hoi', 'hoan_tat']);
export const FEEDBACK_STATUS = /** @type {const} */ (['moi', 'dang_giai_trinh', 'da_giai_trinh', 'khong_tiep_thu']);

/** @typedef {import('node:sqlite').DatabaseSync} DB */

// Hạn hiệu lực theo ngày VN (dùng cho sắp xếp/lọc)
const DUE_EXPR = "COALESCE(t.due_date, date(t.due_at, '+7 hours'))";

/** @param {any} t */
export function isOverdue(t, today = todayVN(), now = new Date().toISOString()) {
  if (t.status === 'hoan_tat' || t.status === 'huy') return false;
  if (t.due_date) return t.due_date < today; // quá hạn khi đã sang ngày kế tiếp
  if (t.due_at) return t.due_at < now;
  return false;
}

/** @param {DB} db @param {any} t */
export function shapeTask(db, t) {
  return {
    id: t.id, title: t.title, notes: t.notes, due_date: t.due_date, due_at: t.due_at,
    due_local: t.due_at ? utcToVn(t.due_at) : t.due_date ? { date: t.due_date, time: null } : null,
    priority: t.priority, status: t.status, project_id: t.project_id, phase: t.phase,
    required_for_progress: !!t.required_for_progress, completed_at: t.completed_at, archived_at: t.archived_at,
    created_at: t.created_at, updated_at: t.updated_at, overdue: isOverdue(t),
    documents: db.prepare('SELECT d.id, d.title, d.category FROM task_documents td JOIN documents d ON d.id = td.document_id WHERE td.task_id = ?').all(t.id),
    emails: db.prepare('SELECT e.id, e.subject, e.status FROM task_emails te JOIN emails e ON e.id = te.email_id WHERE te.task_id = ?').all(t.id),
    feedback_ids: db.prepare('SELECT id FROM feedback WHERE linked_task_id = ?').all(t.id).map((r) => /** @type {any} */ (r).id),
  };
}

/** @param {DB} db @param {string} id */
function getTask(db, id) {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!t) throw new HttpError(404, 'Không tìm thấy nhiệm vụ');
  return t;
}

/** @param {DB} db @param {string} id */
function rebuildTaskSearch(db, id) {
  const t = /** @type {any} */ (db.prepare('SELECT title, notes FROM tasks WHERE id = ?').get(id));
  db.prepare('UPDATE tasks SET search_text = ? WHERE id = ?').run([t.title, t.notes].filter(Boolean).map(norm).join(' | '), id);
}

/** @param {any} b */
function readTask(b) {
  const title = str(b, 'title', { required: true, max: 300, label: 'tên việc' });
  const dueKind = oneOf(b, 'due_kind', /** @type {const} */ (['none', 'date', 'datetime']), 'none');
  let due_date = null;
  let due_at = null;
  if (dueKind === 'date') due_date = ymd(b, 'due_date', 'Hạn') ?? (() => { throw new HttpError(400, 'Chưa chọn ngày hạn', { due_date: 'Chọn ngày' }); })();
  if (dueKind === 'datetime') {
    const d = ymd(b, 'due_date', 'Hạn');
    const t = hhmm(b, 'due_time');
    if (!d || !t) throw new HttpError(400, 'Hạn có giờ cần đủ ngày và giờ', { due_time: 'Nhập giờ' });
    due_at = vnLocalToUtc(d, t);
  }
  return {
    title, due_date, due_at,
    notes: str(b, 'notes', { max: 5000 }),
    priority: oneOf(b, 'priority', PRIORITY, 'trung_binh'),
    status: oneOf(b, 'status', TASK_STATUS, 'chua_lam'),
    project_id: str(b, 'project_id', { max: 64 }),
    phase: oneOf(b, 'phase', /** @type {const} */ (['truoc_bao_ve', 'sau_bao_ve'])),
    required: bool(b, 'required_for_progress') ? 1 : 0,
  };
}

/** @param {DB} db @param {any} b @param {{documentIds?: string[], emailIds?: string[]}} [links] */
export function createTask(db, b, links = {}) {
  const f = readTask(b);
  const id = newId('task');
  const now = nowIso();
  tx(db, () => {
    db.prepare(`INSERT INTO tasks (id, title, notes, due_date, due_at, priority, status, project_id, phase, required_for_progress, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, f.title, f.notes, f.due_date, f.due_at, f.priority, f.status, f.project_id, f.phase, f.required, f.status === 'hoan_tat' ? now : null, now, now);
    for (const d of links.documentIds ?? idList(b, 'document_ids')) db.prepare('INSERT OR IGNORE INTO task_documents (task_id, document_id) VALUES (?, ?)').run(id, d);
    for (const e of links.emailIds ?? idList(b, 'email_ids')) db.prepare('INSERT OR IGNORE INTO task_emails (task_id, email_id) VALUES (?, ?)').run(id, e);
    rebuildTaskSearch(db, id);
  });
  return shapeTask(db, getTask(db, id));
}

/** @param {DB} db @param {URLSearchParams} q */
export function listTasks(db, q) {
  const where = [];
  /** @type {any[]} */
  const p = [];
  if (q.get('archived') === '1') where.push('t.archived_at IS NOT NULL'); else where.push('t.archived_at IS NULL');
  const statuses = (q.get('status') ?? '').split(',').filter((s) => TASK_STATUS.includes(/** @type {any} */ (s)));
  if (statuses.length) { where.push(`t.status IN (${statuses.map(() => '?').join(',')})`); p.push(...statuses); }
  if (q.get('open') === '1') where.push("t.status NOT IN ('hoan_tat', 'huy')");
  if (q.get('priority')) { where.push('t.priority = ?'); p.push(q.get('priority')); }
  if (q.get('project_id')) { where.push('t.project_id = ?'); p.push(q.get('project_id')); }
  if (q.get('phase')) { where.push('t.phase = ?'); p.push(q.get('phase')); }
  const today = todayVN();
  const due = q.get('due');
  if (due === 'overdue') { where.push(`t.status NOT IN ('hoan_tat','huy') AND ((t.due_date IS NOT NULL AND t.due_date < ?) OR (t.due_at IS NOT NULL AND t.due_at < ?))`); p.push(today, nowIso()); }
  if (due === 'today') { where.push(`${DUE_EXPR} = ?`); p.push(today); }
  if (due === 'week') { where.push(`${DUE_EXPR} >= ? AND ${DUE_EXPR} < ?`); p.push(today, addDays(today, 7)); }
  if (due === 'none') where.push('t.due_date IS NULL AND t.due_at IS NULL');
  const term = norm(q.get('q'));
  if (term) for (const w of term.split(' ')) { where.push("t.search_text LIKE ? ESCAPE '\\'"); p.push(`%${w.replace(/[%_\\]/g, '\\$&')}%`); }
  const rows = db.prepare(`SELECT t.* FROM tasks t WHERE ${where.join(' AND ')}
    ORDER BY CASE WHEN t.status IN ('hoan_tat','huy') THEN 1 ELSE 0 END, ${DUE_EXPR} IS NULL, ${DUE_EXPR}, t.due_at,
    CASE t.priority WHEN 'cao' THEN 0 WHEN 'trung_binh' THEN 1 ELSE 2 END, t.created_at LIMIT 1000`).all(...p);
  return rows.map((t) => shapeTask(db, t));
}

// ---------- Sự kiện ----------

/** @param {any} e */
export function shapeEvent(e) {
  const out = {
    id: e.id, title: e.title, notes: e.notes, all_day: !!e.all_day, location: e.location, project_id: e.project_id,
    linked_task_id: e.linked_task_id, document_id: e.document_id, archived_at: e.archived_at,
    start_at: e.start_at, end_at: e.end_at, start_date: e.start_date, end_date: e.end_date,
    document_title: e.document_title ?? null, task_title: e.task_title ?? null,
    /** @type {{date: string, time: string|null}} */ start_local: { date: '', time: null },
    /** @type {{date: string, time: string|null} | null} */ end_local: null,
  };
  if (e.all_day) {
    out.start_local = { date: e.start_date, time: null };
    out.end_local = { date: addDays(e.end_date, -1), time: null }; // hiển thị ngày kết thúc bao gồm
  } else {
    out.start_local = utcToVn(e.start_at);
    out.end_local = e.end_at ? utcToVn(e.end_at) : null;
  }
  return out;
}

/** @param {any} b */
function readEvent(b) {
  const title = str(b, 'title', { required: true, max: 300, label: 'tên sự kiện' });
  const all_day = bool(b, 'all_day');
  const sd = ymd(b, 'start_date', 'Ngày bắt đầu');
  if (!sd) throw new HttpError(400, 'Chưa chọn ngày bắt đầu', { start_date: 'Bắt buộc' });
  const ed = ymd(b, 'end_date', 'Ngày kết thúc') ?? sd;
  if (ed < sd) throw new HttpError(400, 'Ngày kết thúc không được trước ngày bắt đầu', { end_date: 'Trước ngày bắt đầu' });
  /** @type {any} */
  const f = {
    title, all_day: all_day ? 1 : 0, location: str(b, 'location', { max: 300 }), notes: str(b, 'notes', { max: 5000 }),
    project_id: str(b, 'project_id', { max: 64 }), linked_task_id: str(b, 'linked_task_id', { max: 64 }), document_id: str(b, 'document_id', { max: 64 }),
    start_at: null, end_at: null, start_date: null, end_date: null,
  };
  if (all_day) {
    f.start_date = sd;
    f.end_date = addDays(ed, 1); // lưu exclusive
  } else {
    const st = hhmm(b, 'start_time');
    if (!st) throw new HttpError(400, 'Sự kiện có giờ cần giờ bắt đầu', { start_time: 'Bắt buộc' });
    const et = hhmm(b, 'end_time');
    f.start_at = vnLocalToUtc(sd, st);
    f.end_at = et ? vnLocalToUtc(ed, et) : null;
    if (f.end_at && f.end_at < f.start_at) throw new HttpError(400, 'Giờ kết thúc không được trước giờ bắt đầu', { end_time: 'Trước giờ bắt đầu' });
  }
  return f;
}

const EVENT_SELECT = `SELECT e.*, d.title AS document_title, t.title AS task_title FROM events e
  LEFT JOIN documents d ON d.id = e.document_id LEFT JOIN tasks t ON t.id = e.linked_task_id`;

/** @param {DB} db @param {string} id */
function getEvent(db, id) {
  const e = db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).get(id);
  if (!e) throw new HttpError(404, 'Không tìm thấy sự kiện');
  return shapeEvent(e);
}

/** Sự kiện và nhiệm vụ trong khoảng [from, to) theo ngày VN — dùng chung cho tuần và tháng. @param {DB} db @param {string} from @param {string} to */
export function calendarRange(db, from, to, { projectId = /** @type {string|null} */ (null) } = {}) {
  const fromUtc = vnLocalToUtc(from, '00:00');
  const toUtc = vnLocalToUtc(to, '00:00');
  const pf = projectId ? ' AND e.project_id = ?' : '';
  const pp = projectId ? [projectId] : [];
  const events = db.prepare(`${EVENT_SELECT} WHERE e.archived_at IS NULL AND (
      (e.all_day = 1 AND e.start_date < ? AND e.end_date > ?) OR
      (e.all_day = 0 AND e.start_at < ? AND COALESCE(e.end_at, e.start_at) >= ?))${pf}
    ORDER BY COALESCE(e.start_date, date(e.start_at, '+7 hours')), e.all_day DESC, e.start_at`).all(to, from, toUtc, fromUtc, ...pp).map(shapeEvent);
  const tasks = db.prepare(`SELECT t.* FROM tasks t WHERE t.archived_at IS NULL AND t.status <> 'huy' AND ${DUE_EXPR} >= ? AND ${DUE_EXPR} < ?${projectId ? ' AND t.project_id = ?' : ''}
    ORDER BY ${DUE_EXPR}, t.due_at`).all(from, to, ...pp).map((t) => shapeTask(db, t));
  return { from, to, timezone: 'Asia/Ho_Chi_Minh', events, tasks };
}

// ---------- Email ----------

/** @param {DB} db @param {any} e */
function shapeEmail(db, e) {
  return {
    ...e, search_text: undefined,
    tasks: db.prepare('SELECT t.id, t.title, t.status, t.due_date, t.due_at, t.archived_at FROM task_emails te JOIN tasks t ON t.id = te.task_id WHERE te.email_id = ? ORDER BY t.created_at').all(e.id),
  };
}
/** @param {DB} db @param {string} id */
function getEmail(db, id) {
  const e = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
  if (!e) throw new HttpError(404, 'Không tìm thấy email');
  return shapeEmail(db, e);
}
/** @param {any} b */
function readEmail(b) {
  return {
    subject: str(b, 'subject', { required: true, max: 300, label: 'tiêu đề' }),
    sender: str(b, 'sender', { max: 200 }),
    received_date: ymd(b, 'received_date', 'Ngày nhận'),
    note: str(b, 'note', { max: 2000 }),
    source_url: url(b, 'source_url'),
    due_date: ymd(b, 'due_date', 'Hạn'),
    status: oneOf(b, 'status', EMAIL_STATUS, 'chua_xu_li'),
  };
}
/** @param {any} f */
const emailSearch = (f) => [f.subject, f.sender, f.note].filter(Boolean).map(norm).join(' | ');

// ---------- Luận văn ----------

/** @param {any} p @param {string} today */
export function defenseInfo(p, today = todayVN()) {
  const hasDayMonth = p.defense_day && p.defense_month;
  const dd = hasDayMonth ? `${String(p.defense_day).padStart(2, '0')}/${String(p.defense_month).padStart(2, '0')}` : null;
  const label = dd ? (p.defense_year ? `${dd}/${p.defense_year}` : `${dd} (chưa xác nhận năm)`) : 'Chưa có ngày bảo vệ';
  let countdown_days = null;
  if (p.date_confirmed && p.defense_year && hasDayMonth) {
    const iso = `${p.defense_year}-${String(p.defense_month).padStart(2, '0')}-${String(p.defense_day).padStart(2, '0')}`;
    countdown_days = daysBetween(today, iso);
  }
  return {
    day: p.defense_day, month: p.defense_month, year: p.defense_year, time: p.defense_time, location: p.defense_location,
    confirmed: !!p.date_confirmed, label, countdown_days,
    needs_confirmation: !p.date_confirmed,
  };
}

/** Tiến độ = việc bắt buộc hoàn tất / việc bắt buộc không hủy. @param {DB} db @param {string} projectId */
export function thesisProgress(db, projectId) {
  const r = /** @type {any} */ (db.prepare(`SELECT
      SUM(CASE WHEN status <> 'huy' THEN 1 ELSE 0 END) AS total,
      SUM(CASE WHEN status = 'hoan_tat' THEN 1 ELSE 0 END) AS done
    FROM tasks WHERE project_id = ? AND required_for_progress = 1 AND archived_at IS NULL`).get(projectId));
  const total = Number(r.total ?? 0);
  const done = Number(r.done ?? 0);
  if (!total) return { total: 0, done: 0, percent: null, label: 'Chưa thiết lập (chưa có đầu việc bắt buộc)' };
  const percent = Math.round((done / total) * 100);
  return { total, done, percent, label: `${done}/${total} đầu việc bắt buộc hoàn tất (${percent}%)` };
}

/** @param {DB} db @param {string} id */
function getProject(db, id) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!p) throw new HttpError(404, 'Không tìm thấy dự án');
  return /** @type {any} */ (p);
}

/** @param {DB} db @param {string} id */
export function projectDetail(db, id) {
  const p = getProject(db, id);
  const today = todayVN();
  const docs = db.prepare(`SELECT d.id, d.title, d.material_type, d.pinned, d.updated_at, d.current_version_id, v.version_label AS current_version_label,
      (SELECT COUNT(*) FROM document_versions vv WHERE vv.document_id = d.id) AS version_count
    FROM project_documents pd JOIN documents d ON d.id = pd.document_id LEFT JOIN document_versions v ON v.id = d.current_version_id
    WHERE pd.project_id = ? AND d.archived_at IS NULL ORDER BY d.updated_at DESC`).all(id);
  const feedback = db.prepare(`SELECT f.*, v.version_label, d.id AS document_id, d.title AS document_title, t.title AS task_title, t.status AS task_status
    FROM feedback f LEFT JOIN document_versions v ON v.id = f.document_version_id LEFT JOIN documents d ON d.id = v.document_id
    LEFT JOIN tasks t ON t.id = f.linked_task_id WHERE f.project_id = ? AND f.archived_at IS NULL ORDER BY f.created_at DESC`).all(id);
  const tasks = db.prepare('SELECT * FROM tasks t WHERE project_id = ? AND archived_at IS NULL ORDER BY ' + DUE_EXPR + ' IS NULL, ' + DUE_EXPR + ', created_at').all(id).map((t) => shapeTask(db, t));
  const events = db.prepare(`${EVENT_SELECT} WHERE e.project_id = ? AND e.archived_at IS NULL AND COALESCE(e.end_date, date(COALESCE(e.end_at, e.start_at), '+7 hours', '+1 day')) > ?
    ORDER BY COALESCE(e.start_date, date(e.start_at, '+7 hours')), e.start_at`).all(id, today).map(shapeEvent);
  return { ...p, defense: defenseInfo(p, today), progress: thesisProgress(db, id), documents: docs, feedback, tasks, events };
}

export function registerWork() {
  // ----- Nhiệm vụ -----
  route('GET', '/api/tasks', ({ db, query }) => ({ items: listTasks(db, query), today: todayVN() }));
  route('POST', '/api/tasks', ({ db, body }) => created(createTask(db, body)));
  route('GET', '/api/tasks/:id', ({ db, params }) => {
    const t = shapeTask(db, getTask(db, params.id));
    const events = db.prepare(`${EVENT_SELECT} WHERE e.linked_task_id = ? AND e.archived_at IS NULL`).all(params.id).map(shapeEvent);
    const project = t.project_id ? db.prepare('SELECT id, name FROM projects WHERE id = ?').get(t.project_id) : null;
    return { ...t, events, project };
  });
  route('PUT', '/api/tasks/:id', ({ db, params, body }) => {
    const old = /** @type {any} */ (getTask(db, params.id));
    const f = readTask(body);
    const now = nowIso();
    tx(db, () => {
      db.prepare(`UPDATE tasks SET title=?, notes=?, due_date=?, due_at=?, priority=?, status=?, project_id=?, phase=?, required_for_progress=?, completed_at=?, updated_at=? WHERE id=?`)
        .run(f.title, f.notes, f.due_date, f.due_at, f.priority, f.status, f.project_id, f.phase, f.required,
          f.status === 'hoan_tat' ? old.completed_at ?? now : null, now, params.id);
      if (Array.isArray(body.document_ids)) {
        db.prepare('DELETE FROM task_documents WHERE task_id = ?').run(params.id);
        for (const d of idList(body, 'document_ids')) db.prepare('INSERT OR IGNORE INTO task_documents (task_id, document_id) VALUES (?, ?)').run(params.id, d);
      }
      rebuildTaskSearch(db, params.id);
    });
    return shapeTask(db, getTask(db, params.id));
  });
  route('POST', '/api/tasks/:id/status', ({ db, params, body }) => {
    const old = /** @type {any} */ (getTask(db, params.id));
    const status = oneOf(body, 'status', TASK_STATUS);
    if (!status) throw new HttpError(400, 'Thiếu trạng thái');
    db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
      .run(status, status === 'hoan_tat' ? old.completed_at ?? nowIso() : null, nowIso(), params.id);
    return shapeTask(db, getTask(db, params.id));
  });
  route('POST', '/api/tasks/:id/archive', ({ db, params }) => {
    getTask(db, params.id);
    db.prepare('UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), params.id);
    return shapeTask(db, getTask(db, params.id));
  });
  route('POST', '/api/tasks/:id/restore', ({ db, params }) => {
    getTask(db, params.id);
    db.prepare('UPDATE tasks SET archived_at = NULL, updated_at = ? WHERE id = ?').run(nowIso(), params.id);
    return shapeTask(db, getTask(db, params.id));
  });
  route('POST', '/api/tasks/:id/documents', ({ db, params, body }) => {
    getTask(db, params.id);
    const docId = str(body, 'document_id', { required: true, max: 64 });
    db.prepare('INSERT OR IGNORE INTO task_documents (task_id, document_id) VALUES (?, ?)').run(params.id, docId);
    return shapeTask(db, getTask(db, params.id));
  });
  route('DELETE', '/api/tasks/:id/documents/:docId', ({ db, params }) => {
    db.prepare('DELETE FROM task_documents WHERE task_id = ? AND document_id = ?').run(params.id, params.docId);
    return shapeTask(db, getTask(db, params.id));
  });

  // ----- Lịch -----
  route('GET', '/api/calendar', ({ db, query }) => {
    const from = ymd({ from: query.get('from') }, 'from', 'from');
    const to = ymd({ to: query.get('to') }, 'to', 'to');
    if (!from || !to || to <= from || daysBetween(from, to) > 62) throw new HttpError(400, 'Khoảng ngày không hợp lệ (tối đa 62 ngày)');
    return calendarRange(db, from, to, { projectId: query.get('project_id') });
  });
  route('GET', '/api/events', ({ db, query }) => {
    const arch = query.get('archived') === '1' ? 'e.archived_at IS NOT NULL' : 'e.archived_at IS NULL';
    const term = norm(query.get('q'));
    const rows = db.prepare(`${EVENT_SELECT} WHERE ${arch} ${term ? "AND e.search_text LIKE ?" : ''} ORDER BY COALESCE(e.start_date, e.start_at) DESC LIMIT 500`)
      .all(...(term ? [`%${term}%`] : []));
    return { items: rows.map(shapeEvent) };
  });
  route('GET', '/api/events/:id', ({ db, params }) => getEvent(db, params.id));
  route('POST', '/api/events', ({ db, body }) => {
    const f = readEvent(body);
    const id = newId('evt');
    const now = nowIso();
    db.prepare(`INSERT INTO events (id, title, notes, all_day, start_at, end_at, start_date, end_date, location, project_id, linked_task_id, document_id, search_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, f.title, f.notes, f.all_day, f.start_at, f.end_at, f.start_date, f.end_date, f.location, f.project_id, f.linked_task_id, f.document_id,
        [f.title, f.location, f.notes].filter(Boolean).map(norm).join(' | '), now, now);
    return created(getEvent(db, id));
  });
  route('PUT', '/api/events/:id', ({ db, params, body }) => {
    getEvent(db, params.id);
    const f = readEvent(body);
    db.prepare(`UPDATE events SET title=?, notes=?, all_day=?, start_at=?, end_at=?, start_date=?, end_date=?, location=?, project_id=?, linked_task_id=?, document_id=?, search_text=?, updated_at=? WHERE id=?`)
      .run(f.title, f.notes, f.all_day, f.start_at, f.end_at, f.start_date, f.end_date, f.location, f.project_id, f.linked_task_id, f.document_id,
        [f.title, f.location, f.notes].filter(Boolean).map(norm).join(' | '), nowIso(), params.id);
    return getEvent(db, params.id);
  });
  route('POST', '/api/events/:id/archive', ({ db, params }) => {
    getEvent(db, params.id);
    db.prepare('UPDATE events SET archived_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), params.id);
    return getEvent(db, params.id);
  });
  route('POST', '/api/events/:id/restore', ({ db, params }) => {
    getEvent(db, params.id);
    db.prepare('UPDATE events SET archived_at = NULL, updated_at = ? WHERE id = ?').run(nowIso(), params.id);
    return getEvent(db, params.id);
  });

  // ----- Email quan trọng (nhập tay) -----
  route('GET', '/api/emails', ({ db, query }) => {
    const where = [query.get('archived') === '1' ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'];
    /** @type {any[]} */
    const p = [];
    if (query.get('status')) { where.push('status = ?'); p.push(query.get('status')); }
    if (query.get('open') === '1') where.push("status <> 'hoan_tat'");
    const term = norm(query.get('q'));
    if (term) for (const w of term.split(' ')) { where.push("search_text LIKE ? ESCAPE '\\'"); p.push(`%${w.replace(/[%_\\]/g, '\\$&')}%`); }
    const rows = db.prepare(`SELECT * FROM emails WHERE ${where.join(' AND ')} ORDER BY CASE status WHEN 'hoan_tat' THEN 1 ELSE 0 END, due_date IS NULL, due_date, received_date DESC, created_at DESC`).all(...p);
    return { items: rows.map((e) => shapeEmail(db, e)) };
  });
  route('GET', '/api/emails/:id', ({ db, params }) => getEmail(db, params.id));
  route('POST', '/api/emails', ({ db, body }) => {
    const f = readEmail(body);
    const id = newId('mail');
    const now = nowIso();
    db.prepare(`INSERT INTO emails (id, subject, sender, received_date, note, source_url, due_date, status, search_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, f.subject, f.sender, f.received_date, f.note, f.source_url, f.due_date, f.status, emailSearch(f), now, now);
    return created(getEmail(db, id));
  });
  route('PUT', '/api/emails/:id', ({ db, params, body }) => {
    getEmail(db, params.id);
    const f = readEmail(body);
    db.prepare(`UPDATE emails SET subject=?, sender=?, received_date=?, note=?, source_url=?, due_date=?, status=?, search_text=?, updated_at=? WHERE id=?`)
      .run(f.subject, f.sender, f.received_date, f.note, f.source_url, f.due_date, f.status, emailSearch(f), nowIso(), params.id);
    return getEmail(db, params.id);
  });
  route('POST', '/api/emails/:id/archive', ({ db, params }) => {
    getEmail(db, params.id);
    db.prepare('UPDATE emails SET archived_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), params.id);
    return getEmail(db, params.id);
  });
  route('POST', '/api/emails/:id/restore', ({ db, params }) => {
    getEmail(db, params.id);
    db.prepare('UPDATE emails SET archived_at = NULL, updated_at = ? WHERE id = ?').run(nowIso(), params.id);
    return getEmail(db, params.id);
  });
  // Tạo nhiệm vụ từ email: nếu đã có nhiệm vụ liên kết (chưa lưu trữ) thì trả về nhiệm vụ đó, trừ khi chủ động force_new.
  route('POST', '/api/emails/:id/create-task', ({ db, params, body }) => {
    const e = getEmail(db, params.id);
    const existing = /** @type {any} */ (db.prepare(`SELECT t.* FROM task_emails te JOIN tasks t ON t.id = te.task_id WHERE te.email_id = ? AND t.archived_at IS NULL ORDER BY t.created_at LIMIT 1`).get(params.id));
    if (existing && !bool(body, 'force_new')) return { created: false, task: shapeTask(db, existing), email: getEmail(db, params.id) };
    const task = createTask(db, {
      title: body?.title ?? `Xử lí email: ${e.subject}`,
      notes: body?.notes ?? null,
      due_kind: (body?.due_date ?? e.due_date) ? 'date' : 'none',
      due_date: body?.due_date ?? e.due_date,
      priority: body?.priority ?? 'trung_binh',
    }, { emailIds: [params.id] });
    return created({ created: true, task, email: getEmail(db, params.id) });
  });

  // ----- Dự án luận văn -----
  route('GET', '/api/projects', ({ db }) => ({ items: db.prepare('SELECT id, name, kind FROM projects WHERE archived_at IS NULL ORDER BY created_at').all() }));
  route('GET', '/api/projects/:id', ({ db, params }) => projectDetail(db, params.id));
  route('PUT', '/api/projects/:id', ({ db, params, body }) => {
    getProject(db, params.id);
    const day = int(body, 'defense_day', { min: 1, max: 31 });
    const month = int(body, 'defense_month', { min: 1, max: 12 });
    const year = int(body, 'defense_year', { min: 2000, max: 2100 });
    const confirmed = bool(body, 'date_confirmed');
    if (confirmed && (!day || !month || !year)) throw new HttpError(400, 'Chỉ xác nhận được khi đã có đủ ngày, tháng, năm', { date_confirmed: 'Thiếu năm' });
    if (day && month && year) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw new HttpError(400, 'Ngày bảo vệ không tồn tại', { defense_day: 'Ngày không tồn tại' });
    }
    db.prepare(`UPDATE projects SET name=?, notes=?, defense_day=?, defense_month=?, defense_year=?, defense_time=?, defense_location=?, date_confirmed=?, updated_at=? WHERE id=?`)
      .run(str(body, 'name', { required: true, max: 200, label: 'tên dự án' }), str(body, 'notes', { max: 5000 }), day, month, year,
        hhmm(body, 'defense_time'), str(body, 'defense_location', { max: 300 }), confirmed ? 1 : 0, nowIso(), params.id);
    return projectDetail(db, params.id);
  });

  // ----- Góp ý / giải trình (gắn với đúng phiên bản được góp ý) -----
  route('POST', '/api/feedback', ({ db, body }) => {
    const projectId = str(body, 'project_id', { required: true, max: 64 });
    getProject(db, /** @type {string} */ (projectId));
    const vid = str(body, 'document_version_id', { max: 64 });
    if (vid && !db.prepare('SELECT 1 FROM document_versions WHERE id = ?').get(vid)) throw new HttpError(400, 'Phiên bản không tồn tại');
    const id = newId('fb');
    const now = nowIso();
    db.prepare(`INSERT INTO feedback (id, project_id, document_version_id, reviewer, content, section_ref, response_note, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, projectId, vid, str(body, 'reviewer', { max: 200 }), str(body, 'content', { required: true, max: 5000, label: 'nội dung góp ý' }),
        str(body, 'section_ref', { max: 200 }), str(body, 'response_note', { max: 5000 }), oneOf(body, 'status', FEEDBACK_STATUS, 'moi'), now, now);
    return created(db.prepare('SELECT * FROM feedback WHERE id = ?').get(id));
  });
  route('PUT', '/api/feedback/:id', ({ db, params, body }) => {
    const fb = db.prepare('SELECT * FROM feedback WHERE id = ?').get(params.id);
    if (!fb) throw new HttpError(404, 'Không tìm thấy góp ý');
    // document_version_id không đổi khi sửa: góp ý luôn gắn bản đã được góp ý
    db.prepare('UPDATE feedback SET reviewer=?, content=?, section_ref=?, response_note=?, status=?, updated_at=? WHERE id=?')
      .run(str(body, 'reviewer', { max: 200 }), str(body, 'content', { required: true, max: 5000, label: 'nội dung góp ý' }), str(body, 'section_ref', { max: 200 }),
        str(body, 'response_note', { max: 5000 }), oneOf(body, 'status', FEEDBACK_STATUS, 'moi'), nowIso(), params.id);
    return db.prepare('SELECT * FROM feedback WHERE id = ?').get(params.id);
  });
  route('POST', '/api/feedback/:id/archive', ({ db, params }) => {
    db.prepare('UPDATE feedback SET archived_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), params.id);
    return { ok: true };
  });
  route('POST', '/api/feedback/:id/restore', ({ db, params }) => {
    db.prepare('UPDATE feedback SET archived_at = NULL, updated_at = ? WHERE id = ?').run(nowIso(), params.id);
    return { ok: true };
  });
  route('POST', '/api/feedback/:id/create-task', ({ db, params, body }) => {
    const fb = /** @type {any} */ (db.prepare('SELECT * FROM feedback WHERE id = ?').get(params.id));
    if (!fb) throw new HttpError(404, 'Không tìm thấy góp ý');
    if (fb.linked_task_id && !bool(body, 'force_new')) {
      const t = /** @type {any} */ (db.prepare('SELECT * FROM tasks WHERE id = ?').get(fb.linked_task_id));
      if (t && !t.archived_at) return { created: false, task: shapeTask(db, t) };
    }
    return tx(db, () => {
      const task = createTask(db, {
        title: body?.title ?? `Giải trình góp ý: ${String(fb.content).slice(0, 80)}`, project_id: fb.project_id, phase: 'truoc_bao_ve',
        required_for_progress: body?.required_for_progress ?? false, due_kind: body?.due_date ? 'date' : 'none', due_date: body?.due_date,
      }, { documentIds: [] });
      db.prepare('UPDATE feedback SET linked_task_id = ?, updated_at = ? WHERE id = ?').run(task.id, nowIso(), params.id);
      return created({ created: true, task });
    });
  });
}
