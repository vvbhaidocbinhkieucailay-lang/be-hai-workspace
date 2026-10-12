// @ts-check
// Mở SQLite (node:sqlite có sẵn trong Node ≥ 22.13), bật khóa ngoại, chạy migration có phiên bản.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

/** Danh sách migration theo thứ tự tên tệp NNN_ten.sql */
export function listMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: Number(f.slice(0, 3)), name: f, file: path.join(MIGRATIONS_DIR, f) }));
}

export const LATEST_SCHEMA = Math.max(...listMigrations().map((m) => m.version));

/** @param {DatabaseSync} db */
export function currentSchemaVersion(db) {
  const has = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
  if (!has) return 0;
  const r = /** @type {{v: number|null}} */ (db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get());
  return r.v ?? 0;
}

/**
 * Mở CSDL; nếu có migration chờ và CSDL đã có dữ liệu thì gọi beforeMigrate (sao lưu) trước.
 * @param {string} file
 * @param {{beforeMigrate?: (db: DatabaseSync, from: number, to: number) => void}} [opt]
 */
export function openDatabase(file, opt = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = FULL;');
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  const from = currentSchemaVersion(db);
  const pending = listMigrations().filter((m) => m.version > from);
  if (pending.length && from > 0 && opt.beforeMigrate) opt.beforeMigrate(db, from, LATEST_SCHEMA);
  for (const m of pending) {
    const sql = fs.readFileSync(m.file, 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(m.version, m.name, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      db.close();
      throw new Error(`Migration ${m.name} thất bại: ${/** @type {Error} */ (e).message}`);
    }
  }
  const fk = db.prepare('PRAGMA foreign_key_check').all();
  if (fk.length) console.warn('[CẢNH BÁO] foreign_key_check phát hiện', fk.length, 'liên kết lỗi');
  return db;
}

/** Bảng dữ liệu được đếm trong manifest sao lưu */
export const DATA_TABLES = [
  'settings', 'projects', 'documents', 'document_versions', 'attachments', 'tags', 'document_tags',
  'document_relations', 'lesson_plans', 'official_documents', 'tasks', 'emails', 'task_documents',
  'task_emails', 'events', 'project_documents', 'feedback', 'schema_migrations',
];

/** @param {DatabaseSync} db */
export function tableCounts(db) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const t of DATA_TABLES) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
    out[t] = exists ? Number(/** @type {any} */ (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get()).n) : 0;
  }
  return out;
}
