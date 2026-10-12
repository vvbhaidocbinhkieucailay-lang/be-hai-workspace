// @ts-check
// Tiện ích dùng chung: lỗi HTTP, kiểm tra đầu vào, chuẩn hóa tìm kiếm, thời gian Asia/Ho_Chi_Minh.
import crypto from 'node:crypto';
import fs from 'node:fs';

export const TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Việt Nam không dùng giờ mùa hè: luôn UTC+07:00

export class HttpError extends Error {
  /** @param {number} status @param {string} message @param {Record<string, string>} [fields] */
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** @param {string} prefix */
export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

/** Chuẩn hóa để tìm kiếm không dấu; KHÔNG dùng để hiển thị. @param {unknown} s */
export function norm(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now = Date.now()) {
  return new Date(now + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** @param {string} ymd @param {number} n */
export function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Thứ Hai của tuần chứa ngày ymd. @param {string} ymd */
export function mondayOf(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  return addDays(ymd, -dow);
}

/** Đổi ngày + giờ địa phương VN sang instant UTC ISO. @param {string} date @param {string} time */
export function vnLocalToUtc(date, time) {
  const d = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Ngày giờ không hợp lệ');
  return d.toISOString();
}

/** Instant UTC → {date, time} theo giờ VN. @param {string} iso */
export function utcToVn(iso) {
  const d = new Date(new Date(iso).getTime() + VN_OFFSET_MS).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
}

/** Số ngày giữa hai ngày YYYY-MM-DD (b - a). @param {string} a @param {string} b */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// ---------- Kiểm tra đầu vào ----------

/**
 * @param {Record<string, any>} body
 * @param {string} key
 * @param {{max?: number, required?: boolean, label?: string}} [opt]
 * @returns {string | null}
 */
export function str(body, key, opt = {}) {
  const max = opt.max ?? 500;
  const v = body?.[key];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    if (opt.required) throw new HttpError(400, `Thiếu ${opt.label ?? key}`, { [key]: 'Bắt buộc nhập' });
    return null;
  }
  if (typeof v !== 'string' && typeof v !== 'number') throw new HttpError(400, `${opt.label ?? key} không hợp lệ`, { [key]: 'Không hợp lệ' });
  const s = String(v).trim();
  if (s.length > max) throw new HttpError(400, `${opt.label ?? key} quá dài (tối đa ${max} kí tự)`, { [key]: `Tối đa ${max} kí tự` });
  return s;
}

/** @param {Record<string, any>} body @param {string} key @param {string} [label] */
export function ymd(body, key, label) {
  const s = str(body, key, { max: 10 });
  if (s === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `${label ?? key}: ngày phải có dạng YYYY-MM-DD`, { [key]: 'Ngày không hợp lệ' });
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new HttpError(400, `${label ?? key}: ngày không tồn tại`, { [key]: 'Ngày không tồn tại' });
  return s;
}

/** @param {Record<string, any>} body @param {string} key */
export function hhmm(body, key) {
  const s = str(body, key, { max: 5 });
  if (s === null) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new HttpError(400, 'Giờ phải có dạng HH:MM (00:00–23:59)', { [key]: 'Giờ không hợp lệ' });
  return s;
}

/** Đường dẫn thư mục/tệp trên máy Windows: D:\\…, D:/… hoặc \\\\máy\\thư-mục. @param {string} s */
export function isLocalPath(s) {
  return /^[a-zA-Z]:[\\/]/.test(s) || /^\\\\[^\\/]+[\\/]/.test(s);
}

/**
 * Nguồn: link http/https/mailto HOẶC đường dẫn thư mục/tệp trên máy (vd. D:\\2026-2027\\Giao an).
 * @param {Record<string, any>} body @param {string} key
 */
export function url(body, key) {
  const s = str(body, key, { max: 2000 });
  if (s === null) return null;
  if (isLocalPath(s)) {
    if (/[\u0000-\u001f<>"|?*]/.test(s.slice(2))) throw new HttpError(400, 'Đường dẫn chứa kí tự không hợp lệ', { [key]: 'Đường dẫn không hợp lệ' });
    return s.replace(/\//g, '\\').replace(/\\+$/, (m) => (s.length <= 3 ? m : ''));
  }
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new HttpError(400, 'Nhập đường dẫn thư mục (vd. D:\\2026-2027\\Giao an) hoặc link bắt đầu bằng http://, https://', { [key]: 'Đường dẫn/link không hợp lệ' });
  }
  if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) {
    throw new HttpError(400, 'Chỉ nhận đường dẫn thư mục trên máy hoặc link http, https, mailto', { [key]: 'Không được phép' });
  }
  return u.toString();
}

/** @template {string} T @param {Record<string, any>} body @param {string} key @param {readonly T[]} values @param {T | null} [def] @returns {T | null} */
export function oneOf(body, key, values, def = null) {
  const v = body?.[key];
  if (v === undefined || v === null || v === '') return def;
  if (!values.includes(v)) throw new HttpError(400, `Giá trị ${key} không hợp lệ`, { [key]: 'Không hợp lệ' });
  return v;
}

/** @param {Record<string, any>} body @param {string} key @param {{min?: number, max?: number}} [opt] */
export function int(body, key, opt = {}) {
  const v = body?.[key];
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || (opt.min !== undefined && n < opt.min) || (opt.max !== undefined && n > opt.max)) {
    throw new HttpError(400, `Giá trị ${key} không hợp lệ`, { [key]: 'Số không hợp lệ' });
  }
  return n;
}

/** @param {Record<string, any>} body @param {string} key */
export function bool(body, key) {
  const v = body?.[key];
  return v === true || v === 1 || v === '1' || v === 'true';
}

/** @param {Record<string, any>} body @param {string} key @returns {string[]} */
export function idList(body, key) {
  const v = body?.[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x.length > 64)) throw new HttpError(400, `${key} không hợp lệ`);
  return [...new Set(v)];
}

/** Danh sách nhãn: mảng hoặc chuỗi phân tách bằng dấu phẩy. @param {Record<string, any>} body */
export function tagList(body, key = 'tags') {
  let v = body?.[key];
  if (v === undefined || v === null) return [];
  if (typeof v === 'string') v = v.split(',');
  if (!Array.isArray(v)) throw new HttpError(400, 'Nhãn không hợp lệ');
  /** @type {Map<string,string>} */
  const out = new Map();
  for (const t of v) {
    if (typeof t !== 'string') continue;
    const label = t.trim().replace(/\s+/g, ' ');
    if (!label) continue;
    if (label.length > 60) throw new HttpError(400, 'Nhãn tối đa 60 kí tự', { tags: 'Nhãn quá dài' });
    if (!out.has(norm(label))) out.set(norm(label), label);
  }
  if (out.size > 30) throw new HttpError(400, 'Tối đa 30 nhãn', { tags: 'Quá nhiều nhãn' });
  return [...out.values()];
}

/** @type {WeakMap<object, number>} */
const txDepth = new WeakMap();

/** Chạy hàm trong transaction (lồng nhau dùng SAVEPOINT). @template T @param {import('node:sqlite').DatabaseSync} db @param {() => T} fn @returns {T} */
export function tx(db, fn) {
  const depth = txDepth.get(db) ?? 0;
  const sp = `sp_${depth}`;
  db.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
  txDepth.set(db, depth + 1);
  try {
    const r = fn();
    db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
    return r;
  } catch (e) {
    try { db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`); } catch { /* đã rollback */ }
    throw e;
  } finally {
    txDepth.set(db, depth);
  }
}

/** @param {string} file */
/** @returns {Promise<string>} */
export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

/** @param {string} file */
export function sha256FileSync(file) {
  // Đọc theo khối để không giữ cả tệp lớn trong bộ nhớ
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1024 * 1024);
  try {
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
}
