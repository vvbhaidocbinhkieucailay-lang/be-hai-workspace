// @ts-check
// Tổng quan (dữ liệu thật, không số giả), tìm kiếm chung và danh sách lưu trữ.
import { route } from '../http.mjs';
import { addDays, mondayOf, norm, nowIso, todayVN } from '../util.mjs';
import { listDocuments } from './documents.mjs';
import { calendarRange, defenseInfo, isOverdue, shapeEvent, shapeTask, thesisProgress } from './work.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DB */

/** @param {DB} db */
export function overview(db) {
  const today = todayVN();
  const now = nowIso();
  const open = db.prepare(`SELECT * FROM tasks WHERE archived_at IS NULL AND status NOT IN ('hoan_tat','huy')`).all().map((t) => /** @type {any} */ (t));
  const effDue = (/** @type {any} */ t) => t.due_date ?? (t.due_at ? new Date(Date.parse(t.due_at) + 7 * 3600e3).toISOString().slice(0, 10) : null);
  const pr = { cao: 0, trung_binh: 1, thap: 2 };
  // Ưu tiên: quá hạn trước, rồi ưu tiên cao, rồi hạn gần
  const ranked = [...open].sort((a, b) => {
    const oa = isOverdue(a, today, now) ? 0 : 1; const ob = isOverdue(b, today, now) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    if (pr[/** @type {'cao'} */ (a.priority)] !== pr[/** @type {'cao'} */ (b.priority)]) return pr[/** @type {'cao'} */ (a.priority)] - pr[/** @type {'cao'} */ (b.priority)];
    const da = effDue(a) ?? '9999'; const dbb = effDue(b) ?? '9999';
    return da < dbb ? -1 : da > dbb ? 1 : 0;
  });
  const withDue = open.filter((t) => effDue(t)).sort((a, b) => ((a.due_at ?? `${a.due_date}T99`) < (b.due_at ?? `${b.due_date}T99`) ? -1 : 1));
  const nextDue = withDue.find((t) => !isOverdue(t, today, now)) ?? null;
  const overdueCount = open.filter((t) => isOverdue(t, today, now)).length;

  const thesis = /** @type {any} */ (db.prepare("SELECT * FROM projects WHERE kind = 'luan_van' AND archived_at IS NULL ORDER BY created_at LIMIT 1").get());
  const monday = mondayOf(today);
  const week = calendarRange(db, monday, addDays(monday, 7));
  const upcoming = db.prepare(`SELECT * FROM tasks WHERE archived_at IS NULL AND status NOT IN ('hoan_tat','huy')
      AND COALESCE(due_date, date(due_at, '+7 hours')) >= ? AND COALESCE(due_date, date(due_at, '+7 hours')) < ?
      ORDER BY COALESCE(due_date, date(due_at, '+7 hours')), due_at LIMIT 10`).all(today, addDays(today, 14)).map((t) => shapeTask(db, t));

  const count = (/** @type {string} */ sql, /** @type {any[]} */ ...p) => Number(/** @type {any} */ (db.prepare(sql).get(...p)).n);
  const q = (/** @type {Record<string,string>} */ o) => new URLSearchParams(o);
  return {
    today,
    timezone: 'Asia/Ho_Chi_Minh',
    priorities: ranked.slice(0, 3).map((t) => shapeTask(db, t)),
    next_due: nextDue ? shapeTask(db, nextDue) : null,
    overdue_count: overdueCount,
    open_task_count: open.length,
    thesis: thesis ? { id: thesis.id, name: thesis.name, defense: defenseInfo(thesis, today), progress: thesisProgress(db, thesis.id) } : null,
    modules: {
      lesson: {
        total: count("SELECT COUNT(*) AS n FROM documents WHERE category='lesson' AND archived_at IS NULL"),
        dang_soan: count("SELECT COUNT(*) AS n FROM documents d JOIN lesson_plans l ON l.document_id=d.id WHERE d.archived_at IS NULL AND l.status='dang_soan'"),
        can_dieu_chinh: count("SELECT COUNT(*) AS n FROM documents d JOIN lesson_plans l ON l.document_id=d.id WHERE d.archived_at IS NULL AND l.status='can_dieu_chinh'"),
      },
      material: {
        total: count("SELECT COUNT(*) AS n FROM documents WHERE category='material' AND archived_at IS NULL"),
        sinh_hoc: count("SELECT COUNT(*) AS n FROM documents WHERE category='material' AND archived_at IS NULL AND subject='Sinh học'"),
        cong_nghe: count("SELECT COUNT(*) AS n FROM documents WHERE category='material' AND archived_at IS NULL AND subject='Công nghệ'"),
      },
      official: {
        total: count("SELECT COUNT(*) AS n FROM documents WHERE category='official' AND archived_at IS NULL"),
        chua_kiem_tra: count("SELECT COUNT(*) AS n FROM documents d JOIN official_documents o ON o.document_id=d.id WHERE d.archived_at IS NULL AND o.validity_status='chua_kiem_tra'"),
      },
      calendar: { open_tasks: open.length, overdue: overdueCount, events_this_week: week.events.length },
      email: {
        open: count("SELECT COUNT(*) AS n FROM emails WHERE archived_at IS NULL AND status <> 'hoan_tat'"),
        total: count('SELECT COUNT(*) AS n FROM emails WHERE archived_at IS NULL'),
      },
      thesis: {
        documents: thesis ? count('SELECT COUNT(*) AS n FROM project_documents pd JOIN documents d ON d.id=pd.document_id WHERE pd.project_id=? AND d.archived_at IS NULL', thesis.id) : 0,
        open_feedback: thesis ? count("SELECT COUNT(*) AS n FROM feedback WHERE project_id=? AND archived_at IS NULL AND status IN ('moi','dang_giai_trinh')", thesis.id) : 0,
      },
    },
    week,
    upcoming_tasks: upcoming,
    documents: {
      pinned: listDocuments(db, q({ pinned: '1', limit: '8' })),
      recent: listDocuments(db, q({ limit: '6' })),
      in_use: listDocuments(db, q({ sort: 'opened', limit: '6' })).filter((d) => d.last_opened_at),
    },
  };
}

/** @param {DB} db @param {string} raw */
export function search(db, raw) {
  const term = norm(raw);
  if (!term) return { q: raw, documents: [], tasks: [], emails: [], events: [] };
  const words = term.split(' ');
  const like = (/** @type {string} */ col) => words.map(() => `${col} LIKE ? ESCAPE '\\'`).join(' AND ');
  const params = words.map((w) => `%${w.replace(/[%_\\]/g, '\\$&')}%`);
  return {
    q: raw,
    documents: listDocuments(db, new URLSearchParams({ q: raw, limit: '50' })),
    tasks: db.prepare(`SELECT * FROM tasks WHERE archived_at IS NULL AND ${like('search_text')} ORDER BY updated_at DESC LIMIT 30`).all(...params).map((t) => shapeTask(db, t)),
    emails: db.prepare(`SELECT id, subject, sender, status, received_date, due_date FROM emails WHERE archived_at IS NULL AND ${like('search_text')} ORDER BY updated_at DESC LIMIT 30`).all(...params),
    events: db.prepare(`SELECT * FROM events WHERE archived_at IS NULL AND ${like('search_text')} ORDER BY COALESCE(start_date, start_at) DESC LIMIT 30`).all(...params).map(shapeEvent),
  };
}

export function registerOverview() {
  route('GET', '/api/overview', ({ db }) => overview(db));
  route('GET', '/api/search', ({ db, query }) => search(db, (query.get('q') ?? '').slice(0, 200)));
  route('GET', '/api/archive', ({ db }) => ({
    documents: listDocuments(db, new URLSearchParams({ archived: '1' })),
    tasks: db.prepare('SELECT * FROM tasks WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all().map((t) => shapeTask(db, t)),
    emails: db.prepare('SELECT id, subject, sender, status, archived_at FROM emails WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all(),
    events: db.prepare('SELECT * FROM events WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all().map(shapeEvent),
    feedback: db.prepare('SELECT id, content, reviewer, archived_at FROM feedback WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all(),
  }));
}
