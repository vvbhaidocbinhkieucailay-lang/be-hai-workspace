// @ts-check
// Tài liệu: một bản ghi chính (documents) + phần mở rộng kế hoạch bài dạy / văn bản; nhiều nhãn; nhiều phiên bản.
import { created, route } from '../http.mjs';
import { HttpError, bool, int, newId, norm, nowIso, oneOf, str, tagList, tx, url, ymd } from '../util.mjs';

export const CATEGORIES = /** @type {const} */ (['lesson', 'material', 'official', 'thesis']);
export const LESSON_STATUS = /** @type {const} */ (['dang_soan', 'san_sang', 'da_day', 'can_dieu_chinh']);
export const MATERIAL_TYPES = /** @type {const} */ (['tai_lieu', 'cau_hoi', 'de', 'dap_an', 'thuc_hanh', 'hsg']);
export const THESIS_TYPES = /** @type {const} */ (['ban_thao', 'ho_so', 'slide', 'cau_hoi_bao_ve', 'giai_trinh', 'khac']);
export const TECH_BRANCHES = /** @type {const} */ (['trong_trot', 'chan_nuoi', 'lam_nghiep', 'thuy_san']);
export const VALIDITY = /** @type {const} */ (['chua_kiem_tra', 'con_hieu_luc', 'het_hieu_luc', 'khong_ap_dung']);

/** @typedef {import('node:sqlite').DatabaseSync} DB */

/** Dựng lại khóa tìm kiếm không dấu cho tài liệu. @param {DB} db @param {string} id */
export function rebuildDocSearch(db, id) {
  const d = /** @type {any} */ (db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
  if (!d) return;
  const tags = db.prepare('SELECT t.label FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = ?').all(id).map((r) => /** @type {any} */ (r).label);
  const l = /** @type {any} */ (db.prepare('SELECT * FROM lesson_plans WHERE document_id = ?').get(id)) ?? {};
  const o = /** @type {any} */ (db.prepare('SELECT * FROM official_documents WHERE document_id = ?').get(id)) ?? {};
  const files = db.prepare('SELECT a.original_name FROM attachments a JOIN document_versions v ON v.id = a.version_id WHERE v.document_id = ?').all(id).map((r) => /** @type {any} */ (r).original_name);
  const text = [d.title, d.summary, d.subject, d.grade, d.school_year, d.material_type, d.tech_branch, ...tags,
    l.class_label, l.lesson_title, l.semester, l.reflection, o.number, o.issuer, o.document_type, o.field, o.action_note, ...files]
    .filter(Boolean).map(norm).join(' | ');
  db.prepare('UPDATE documents SET search_text = ? WHERE id = ?').run(text, id);
}

/** @param {DB} db @param {string} docId @param {string[]} labels */
function syncTags(db, docId, labels) {
  db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(docId);
  for (const label of labels) {
    const key = norm(label);
    let t = /** @type {any} */ (db.prepare('SELECT id FROM tags WHERE label_norm = ?').get(key));
    if (!t) {
      t = { id: newId('tag') };
      db.prepare('INSERT INTO tags (id, label, label_norm, created_at) VALUES (?, ?, ?, ?)').run(t.id, label, key, nowIso());
    }
    db.prepare('INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)').run(docId, t.id);
  }
}

const LIST_SELECT = `
SELECT d.*, v.version_label AS current_version_label,
  (SELECT COUNT(*) FROM attachments a JOIN document_versions vv ON vv.id = a.version_id WHERE vv.document_id = d.id) AS attachment_count,
  l.semester, l.class_label, l.lesson_title, l.periods, l.status AS lesson_status, l.reflection,
  o.number, o.issuer, o.document_type, o.field, o.issued_date, o.validity_status, o.validity_source, o.checked_date, o.action_note
FROM documents d
LEFT JOIN document_versions v ON v.id = d.current_version_id
LEFT JOIN lesson_plans l ON l.document_id = d.id
LEFT JOIN official_documents o ON o.document_id = d.id`;

/** @param {DB} db @param {any} r */
export function shapeDoc(db, r) {
  const tags = db.prepare('SELECT t.id, t.label FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = ? ORDER BY t.label').all(r.id);
  return {
    id: r.id, title: r.title, category: r.category, summary: r.summary, subject: r.subject, grade: r.grade,
    school_year: r.school_year, material_type: r.material_type, tech_branch: r.tech_branch, source_url: r.source_url,
    pinned: !!r.pinned, archived_at: r.archived_at, current_version_id: r.current_version_id,
    current_version_label: r.current_version_label ?? null, attachment_count: Number(r.attachment_count ?? 0),
    last_opened_at: r.last_opened_at, created_at: r.created_at, updated_at: r.updated_at, tags,
    lesson: r.category === 'lesson' ? { semester: r.semester, class_label: r.class_label, lesson_title: r.lesson_title, periods: r.periods, status: r.lesson_status, reflection: r.reflection } : null,
    official: r.category === 'official' ? {
      number: r.number, issuer: r.issuer, document_type: r.document_type, field: r.field, issued_date: r.issued_date,
      validity_status: r.validity_status, validity_source: r.validity_source, checked_date: r.checked_date, action_note: r.action_note,
    } : null,
  };
}

/** @param {DB} db @param {string} id */
export function getDocRow(db, id) {
  const r = db.prepare(`${LIST_SELECT} WHERE d.id = ?`).get(id);
  if (!r) throw new HttpError(404, 'Không tìm thấy tài liệu');
  return r;
}

/**
 * Truy vấn danh sách có lọc (các nhóm lọc kết hợp AND).
 * @param {DB} db @param {URLSearchParams} q
 */
export function listDocuments(db, q) {
  const where = [];
  /** @type {any[]} */
  const p = [];
  const add = (/** @type {string} */ sql, /** @type {any} */ v) => { where.push(sql); p.push(v); };
  if (q.get('archived') === '1') where.push('d.archived_at IS NOT NULL');
  else if (q.get('archived') !== 'all') where.push('d.archived_at IS NULL');
  if (q.get('category')) add('d.category = ?', q.get('category'));
  if (q.get('subject')) add('d.subject = ?', q.get('subject'));
  if (q.get('grade')) add('d.grade = ?', q.get('grade'));
  if (q.get('school_year')) add('d.school_year = ?', q.get('school_year'));
  if (q.get('semester')) add('l.semester = ?', q.get('semester'));
  if (q.get('status')) add('l.status = ?', q.get('status'));
  if (q.get('material_type')) add('d.material_type = ?', q.get('material_type'));
  if (q.get('tech_branch')) add('d.tech_branch = ?', q.get('tech_branch'));
  if (q.get('validity_status')) add('o.validity_status = ?', q.get('validity_status'));
  if (q.get('document_type')) add('o.document_type = ?', q.get('document_type'));
  if (q.get('pinned') === '1') where.push('d.pinned = 1');
  if (q.get('project_id')) add('EXISTS (SELECT 1 FROM project_documents pd WHERE pd.document_id = d.id AND pd.project_id = ?)', q.get('project_id'));
  if (q.get('tag')) add('EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = d.id AND t.label_norm = ?)', norm(q.get('tag')));
  const term = norm(q.get('q'));
  if (term) for (const w of term.split(' ')) add("d.search_text LIKE ? ESCAPE '\\'", `%${w.replace(/[%_\\]/g, '\\$&')}%`);
  const order = q.get('sort') === 'title' ? 'd.title COLLATE NOCASE' : q.get('sort') === 'opened' ? 'd.last_opened_at DESC' : 'd.pinned DESC, d.updated_at DESC';
  const limit = Math.min(Number(q.get('limit')) || 500, 1000);
  const rows = db.prepare(`${LIST_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ${limit}`).all(...p);
  return rows.map((r) => shapeDoc(db, r));
}

/** Đọc & kiểm tra trường chung + phần mở rộng. @param {any} b @param {string} category */
function readDocFields(b, category) {
  const f = {
    title: str(b, 'title', { required: true, max: 300, label: 'tên tài liệu' }),
    summary: str(b, 'summary', { max: 5000 }),
    subject: str(b, 'subject', { max: 60 }),
    grade: str(b, 'grade', { max: 20 }),
    school_year: str(b, 'school_year', { max: 20 }),
    material_type: category === 'material' ? oneOf(b, 'material_type', MATERIAL_TYPES) : category === 'thesis' ? oneOf(b, 'material_type', THESIS_TYPES) : null,
    tech_branch: oneOf(b, 'tech_branch', TECH_BRANCHES),
    source_url: url(b, 'source_url'),
    tags: tagList(b),
  };
  if (f.school_year && !/^\d{4}-\d{4}$/.test(f.school_year)) throw new HttpError(400, 'Năm học có dạng 2026-2027', { school_year: 'Dạng 2026-2027' });
  if (f.tech_branch && f.subject !== 'Công nghệ') f.tech_branch = null;
  const l = b.lesson ?? {};
  const lesson = category === 'lesson' ? {
    semester: oneOf(l, 'semester', /** @type {const} */ (['HK1', 'HK2'])),
    class_label: str(l, 'class_label', { max: 60 }),
    lesson_title: str(l, 'lesson_title', { max: 300 }),
    periods: int(l, 'periods', { min: 1, max: 50 }),
    status: oneOf(l, 'status', LESSON_STATUS, 'dang_soan'),
    reflection: str(l, 'reflection', { max: 5000 }),
  } : null;
  const o = b.official ?? {};
  const official = category === 'official' ? {
    number: str(o, 'number', { max: 100 }),
    issuer: str(o, 'issuer', { max: 200 }),
    document_type: str(o, 'document_type', { max: 60 }),
    field: str(o, 'field', { max: 100 }),
    issued_date: ymd(o, 'issued_date', 'Ngày ban hành'),
    validity_status: oneOf(o, 'validity_status', VALIDITY, 'chua_kiem_tra'),
    validity_source: url(o, 'validity_source'),
    checked_date: ymd(o, 'checked_date', 'Ngày kiểm tra'),
    action_note: str(o, 'action_note', { max: 2000 }),
  } : null;
  if (official && ['con_hieu_luc', 'het_hieu_luc'].includes(/** @type {string} */ (official.validity_status)) && (!official.validity_source || !official.checked_date)) {
    throw new HttpError(400, 'Muốn ghi trạng thái hiệu lực phải nhập nguồn kiểm tra chính thức và ngày kiểm tra', { validity_status: 'Cần nguồn và ngày kiểm tra' });
  }
  return { f, lesson, official };
}

/** @param {DB} db @param {string} id @param {any} lesson @param {any} official */
function upsertExtensions(db, id, lesson, official) {
  if (lesson) {
    db.prepare(`INSERT INTO lesson_plans (document_id, semester, class_label, lesson_title, periods, status, reflection) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET semester=excluded.semester, class_label=excluded.class_label, lesson_title=excluded.lesson_title,
      periods=excluded.periods, status=excluded.status, reflection=excluded.reflection`)
      .run(id, lesson.semester, lesson.class_label, lesson.lesson_title, lesson.periods, lesson.status, lesson.reflection);
  }
  if (official) {
    db.prepare(`INSERT INTO official_documents (document_id, number, issuer, document_type, field, issued_date, validity_status, validity_source, checked_date, action_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(document_id) DO UPDATE SET number=excluded.number, issuer=excluded.issuer,
      document_type=excluded.document_type, field=excluded.field, issued_date=excluded.issued_date, validity_status=excluded.validity_status,
      validity_source=excluded.validity_source, checked_date=excluded.checked_date, action_note=excluded.action_note`)
      .run(id, official.number, official.issuer, official.document_type, official.field, official.issued_date, official.validity_status,
        official.validity_source, official.checked_date, official.action_note);
  }
}

/** @param {DB} db @param {any} b */
export function createDocument(db, b) {
  const category = oneOf(b, 'category', CATEGORIES);
  if (!category) throw new HttpError(400, 'Thiếu nhóm tài liệu', { category: 'Bắt buộc' });
  const { f, lesson, official } = readDocFields(b, category);
  const projectId = str(b, 'project_id', { max: 64 }) ?? (category === 'thesis' ? 'prj_luan_van' : null);
  const id = newId('doc');
  const now = nowIso();
  tx(db, () => {
    db.prepare(`INSERT INTO documents (id, title, category, summary, subject, grade, school_year, material_type, tech_branch, source_url, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, f.title, category, f.summary, f.subject, f.grade, f.school_year, f.material_type, f.tech_branch, f.source_url, bool(b, 'pinned') ? 1 : 0, now, now);
    upsertExtensions(db, id, lesson, official);
    syncTags(db, id, f.tags);
    if (projectId) db.prepare('INSERT OR IGNORE INTO project_documents (project_id, document_id) VALUES (?, ?)').run(projectId, id);
    // Phiên bản đầu tiên (chưa có tệp) để có thể gắn tệp và góp ý
    const vid = newId('ver');
    db.prepare('INSERT INTO document_versions (id, document_id, version_label, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(vid, id, str(b, 'version_label', { max: 60 }) ?? 'Bản 1', null, now);
    db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(vid, id);
    rebuildDocSearch(db, id);
  });
  return shapeDoc(db, getDocRow(db, id));
}

/** @param {DB} db @param {string} id */
export function documentDetail(db, id) {
  const doc = shapeDoc(db, getDocRow(db, id));
  const versions = db.prepare('SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC').all(id).map((v) => ({
    ...v,
    is_current: /** @type {any} */ (v).id === doc.current_version_id,
    attachments: db.prepare('SELECT id, original_name, mime, bytes, sha256, created_at FROM attachments WHERE version_id = ? ORDER BY created_at').all(/** @type {any} */ (v).id),
  }));
  const relShape = (/** @type {any} */ r) => ({ id: r.id, title: r.title, category: r.category, archived_at: r.archived_at });
  const related = db.prepare(`SELECT d.id, d.title, d.category, d.archived_at FROM document_relations r JOIN documents d ON d.id = r.related_document_id WHERE r.document_id = ?
    UNION SELECT d.id, d.title, d.category, d.archived_at FROM document_relations r JOIN documents d ON d.id = r.document_id WHERE r.related_document_id = ?`).all(id, id).map(relShape);
  const tasks = db.prepare(`SELECT t.id, t.title, t.status, t.due_date, t.due_at, t.priority FROM task_documents td JOIN tasks t ON t.id = td.task_id WHERE td.document_id = ? AND t.archived_at IS NULL ORDER BY t.created_at`).all(id);
  const events = db.prepare('SELECT id, title, all_day, start_at, end_at, start_date, end_date, location FROM events WHERE document_id = ? AND archived_at IS NULL ORDER BY COALESCE(start_date, start_at)').all(id);
  const projects = db.prepare('SELECT p.id, p.name FROM project_documents pd JOIN projects p ON p.id = pd.project_id WHERE pd.document_id = ?').all(id);
  const feedback = db.prepare('SELECT * FROM feedback WHERE document_version_id IN (SELECT id FROM document_versions WHERE document_id = ?) AND archived_at IS NULL ORDER BY created_at').all(id);
  return { ...doc, versions, related, tasks, events, projects, feedback };
}

/** @param {DB} db @param {string} id */
function touch(db, id) {
  db.prepare('UPDATE documents SET updated_at = ? WHERE id = ?').run(nowIso(), id);
}

export function registerDocuments() {
  route('GET', '/api/documents', ({ db, query }) => ({ items: listDocuments(db, query) }));
  route('POST', '/api/documents', ({ db, body }) => created(createDocument(db, body)));
  route('GET', '/api/documents/:id', ({ db, params }) => documentDetail(db, params.id));

  route('PUT', '/api/documents/:id', ({ db, params, body }) => {
    const row = /** @type {any} */ (getDocRow(db, params.id));
    const { f, lesson, official } = readDocFields(body, row.category);
    tx(db, () => {
      db.prepare(`UPDATE documents SET title=?, summary=?, subject=?, grade=?, school_year=?, material_type=?, tech_branch=?, source_url=?, updated_at=? WHERE id=?`)
        .run(f.title, f.summary, f.subject, f.grade, f.school_year, f.material_type, f.tech_branch, f.source_url, nowIso(), params.id);
      upsertExtensions(db, params.id, lesson, official);
      syncTags(db, params.id, f.tags);
      rebuildDocSearch(db, params.id);
    });
    return shapeDoc(db, getDocRow(db, params.id));
  });

  route('POST', '/api/documents/:id/pin', ({ db, params, body }) => {
    getDocRow(db, params.id);
    db.prepare('UPDATE documents SET pinned = ? WHERE id = ?').run(bool(body, 'pinned') ? 1 : 0, params.id);
    return shapeDoc(db, getDocRow(db, params.id));
  });
  route('POST', '/api/documents/:id/archive', ({ db, params }) => {
    getDocRow(db, params.id);
    db.prepare('UPDATE documents SET archived_at = ?, pinned = 0, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), params.id);
    return shapeDoc(db, getDocRow(db, params.id));
  });
  route('POST', '/api/documents/:id/restore', ({ db, params }) => {
    getDocRow(db, params.id);
    db.prepare('UPDATE documents SET archived_at = NULL, updated_at = ? WHERE id = ?').run(nowIso(), params.id);
    return shapeDoc(db, getDocRow(db, params.id));
  });
  route('POST', '/api/documents/:id/opened', ({ db, params }) => {
    getDocRow(db, params.id);
    db.prepare('UPDATE documents SET last_opened_at = ? WHERE id = ?').run(nowIso(), params.id);
    return { ok: true };
  });

  // Phiên bản
  route('POST', '/api/documents/:id/versions', ({ db, params, body }) => {
    getDocRow(db, params.id);
    const vid = newId('ver');
    tx(db, () => {
      db.prepare('INSERT INTO document_versions (id, document_id, version_label, notes, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(vid, params.id, str(body, 'version_label', { max: 60, required: true, label: 'tên phiên bản' }), str(body, 'notes', { max: 2000 }), nowIso());
      if (bool(body, 'make_current')) db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(vid, params.id);
      touch(db, params.id);
    });
    return created(documentDetail(db, params.id));
  });
  route('POST', '/api/documents/:id/current-version', ({ db, params, body }) => {
    getDocRow(db, params.id);
    const vid = str(body, 'version_id', { required: true, max: 64 });
    tx(db, () => {
      db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(vid, params.id); // trigger chặn phiên bản của tài liệu khác
      touch(db, params.id);
    });
    return documentDetail(db, params.id);
  });

  // Liên kết tài liệu ↔ tài liệu (vd. kế hoạch bài dạy ↔ học liệu)
  route('POST', '/api/documents/:id/relations', ({ db, params, body }) => {
    getDocRow(db, params.id);
    const other = str(body, 'related_document_id', { required: true, max: 64 });
    if (other === params.id) throw new HttpError(400, 'Không thể liên kết tài liệu với chính nó');
    getDocRow(db, /** @type {string} */ (other));
    const exists = db.prepare('SELECT 1 FROM document_relations WHERE (document_id=? AND related_document_id=?) OR (document_id=? AND related_document_id=?)').get(params.id, other, other, params.id);
    if (!exists) db.prepare('INSERT INTO document_relations (document_id, related_document_id, created_at) VALUES (?, ?, ?)').run(params.id, other, nowIso());
    return documentDetail(db, params.id);
  });
  route('DELETE', '/api/documents/:id/relations/:other', ({ db, params }) => {
    db.prepare('DELETE FROM document_relations WHERE (document_id=? AND related_document_id=?) OR (document_id=? AND related_document_id=?)').run(params.id, params.other, params.other, params.id);
    return documentDetail(db, params.id);
  });

  route('GET', '/api/tags', ({ db }) => ({
    items: db.prepare(`SELECT t.id, t.label, COUNT(d.id) AS count FROM tags t LEFT JOIN document_tags dt ON dt.tag_id = t.id
      LEFT JOIN documents d ON d.id = dt.document_id AND d.archived_at IS NULL GROUP BY t.id ORDER BY t.label`).all(),
  }));
  route('GET', '/api/facets', ({ db }) => ({
    school_years: db.prepare("SELECT DISTINCT school_year AS v FROM documents WHERE school_year IS NOT NULL ORDER BY v DESC").all().map((r) => /** @type {any} */ (r).v),
    grades: db.prepare("SELECT DISTINCT grade AS v FROM documents WHERE grade IS NOT NULL ORDER BY v").all().map((r) => /** @type {any} */ (r).v),
    issuers: db.prepare("SELECT DISTINCT issuer AS v FROM official_documents WHERE issuer IS NOT NULL ORDER BY v").all().map((r) => /** @type {any} */ (r).v),
    document_types: db.prepare("SELECT DISTINCT document_type AS v FROM official_documents WHERE document_type IS NOT NULL ORDER BY v").all().map((r) => /** @type {any} */ (r).v),
  }));
}
