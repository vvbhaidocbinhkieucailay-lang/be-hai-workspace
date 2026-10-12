// @ts-check
// Sao lưu / kiểm tra / diễn tập khôi phục / khôi phục theo SOP-04.
// Gói sao lưu là một thư mục trong backups/: db.sqlite (snapshot nhất quán bằng VACUUM INTO), files/…, manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { APP_VERSION } from './app.mjs';
import { LATEST_SCHEMA, currentSchemaVersion, tableCounts } from './db.mjs';
import { HttpError, TIMEZONE, sha256FileSync, utcToVn } from './util.mjs';

export const NAME_RE = /^NMW_\d{8}_\d{6}(_[a-z0-9_]{1,40})?$/;
const MAX_PACKAGE_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB

/** @param {string} [label] */
export function backupName(label) {
  const { date, time } = utcToVn(new Date().toISOString());
  const secs = String(new Date().getUTCSeconds()).padStart(2, '0');
  const base = `NMW_${date.replace(/-/g, '')}_${time.replace(':', '')}${secs}`;
  const clean = (label ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return clean ? `${base}_${clean}` : base;
}

/** @param {string} p */
function sqlQuote(p) {
  return `'${p.replace(/'/g, "''")}'`;
}

/** Đường dẫn tương đối an toàn (không tuyệt đối, không .., không kí tự lạ). @param {string} rel */
export function safeRel(rel) {
  if (typeof rel !== 'string' || !rel || rel.length > 400) return false;
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.includes('\\') || rel.includes('\0')) return false;
  return rel.split('/').every((seg) => seg && seg !== '..' && seg !== '.');
}

/**
 * Tạo bản sao lưu đầy đủ, đồng bộ (khóa ghi trong lúc chạy).
 * @param {import('./app.mjs').App} app @param {string} [label]
 */
export function createBackup(app, label) {
  if (app.mode !== 'real') throw new HttpError(409, 'Đang ở chế độ minh họa: hãy thoát về dữ liệu thật trước khi sao lưu.');
  let name = backupName(label);
  let i = 2;
  while (fs.existsSync(path.join(app.backupsDir, name))) name = `${backupName(label)}_${i++}`.slice(0, 80);
  const tmp = path.join(app.backupsDir, `.tmp_${name}`);
  const final = path.join(app.backupsDir, name);
  const prevBusy = app.busy;
  app.busy = 'sao lưu dữ liệu';
  try {
    fs.mkdirSync(path.join(tmp, 'files'), { recursive: true });
    const dbOut = path.join(tmp, 'db.sqlite');
    app.db.exec(`VACUUM INTO ${sqlQuote(dbOut)}`); // snapshot nhất quán, gồm cả dữ liệu đang trong WAL
    const snap = new DatabaseSync(dbOut, { readOnly: true });
    const counts = tableCounts(snap);
    const schema = currentSchemaVersion(snap);
    const atts = /** @type {any[]} */ (snap.prepare('SELECT stored_relative_path, sha256, bytes FROM attachments').all());
    snap.close();
    const files = [];
    const missing = [];
    for (const a of atts) {
      const src = path.join(app.filesDir, a.stored_relative_path);
      if (!safeRel(a.stored_relative_path) || !fs.existsSync(src)) { missing.push(a.stored_relative_path); continue; }
      const dest = path.join(tmp, 'files', a.stored_relative_path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
      const sha = sha256FileSync(dest);
      files.push({ path: `files/${a.stored_relative_path}`, bytes: fs.statSync(dest).size, sha256: sha, matches_db: sha === a.sha256 });
    }
    const created = new Date().toISOString();
    const vn = utcToVn(created);
    const manifest = {
      format: 'NMW-BACKUP-1', name, app_version: APP_VERSION, schema_version: schema, created_at: created,
      created_at_local: `${vn.date} ${vn.time}`, timezone: TIMEZONE, counts,
      db: { path: 'db.sqlite', bytes: fs.statSync(dbOut).size, sha256: sha256FileSync(dbOut) },
      files, missing_files: missing,
      note: 'Gói chứa dữ liệu cá nhân. Không đưa lên Git/public.',
    };
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
    const check = verifyPackage(tmp);
    if (!check.ok) throw new HttpError(500, 'Bản sao vừa tạo không vượt qua kiểm tra: ' + check.errors.join('; '));
    fs.renameSync(tmp, final);
    return { name, manifest, verify: check };
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true }); // chỉ dọn thư mục tạm của chính lần sao lưu này
    throw e;
  } finally {
    app.busy = prevBusy;
  }
}

/**
 * Kiểm tra gói: manifest, đường dẫn an toàn, không symlink, kích thước + SHA-256, integrity_check, khóa ngoại, số bản ghi.
 * @param {string} dir
 */
export function verifyPackage(dir) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {any} */
  let manifest = null;
  const mfile = path.join(dir, 'manifest.json');
  try {
    if (fs.lstatSync(mfile).isSymbolicLink()) throw new Error('symlink');
    manifest = JSON.parse(fs.readFileSync(mfile, 'utf8'));
  } catch {
    return { ok: false, errors: ['Thiếu hoặc hỏng manifest.json'], warnings, manifest: null };
  }
  if (manifest.format !== 'NMW-BACKUP-1') errors.push('Định dạng gói không đúng (cần NMW-BACKUP-1)');
  if (!Number.isInteger(manifest.schema_version) || manifest.schema_version > LATEST_SCHEMA) errors.push(`Phiên bản schema ${manifest.schema_version} không tương thích (ứng dụng hỗ trợ tới ${LATEST_SCHEMA})`);
  const realDir = fs.realpathSync(dir);
  let total = 0;
  /** @param {string} rel @param {number} bytes @param {string} sha */
  const checkFile = (rel, bytes, sha) => {
    if (!safeRel(rel)) { errors.push(`Đường dẫn không an toàn trong manifest: ${rel}`); return; }
    const full = path.join(dir, rel);
    let st;
    try { st = fs.lstatSync(full); } catch { errors.push(`Thiếu tệp: ${rel}`); return; }
    if (st.isSymbolicLink() || !st.isFile()) { errors.push(`Không phải tệp thường (symlink/thư mục): ${rel}`); return; }
    if (!fs.realpathSync(full).startsWith(realDir + path.sep)) { errors.push(`Tệp nằm ngoài gói: ${rel}`); return; }
    total += st.size;
    if (st.size !== bytes) errors.push(`Sai kích thước: ${rel}`);
    else if (sha256FileSync(full) !== sha) errors.push(`Sai checksum SHA-256: ${rel}`);
  };
  if (!manifest.db || manifest.db.path !== 'db.sqlite') errors.push('Manifest thiếu thông tin CSDL');
  else checkFile('db.sqlite', manifest.db.bytes, manifest.db.sha256);
  const listed = new Map();
  for (const f of Array.isArray(manifest.files) ? manifest.files : []) {
    if (typeof f?.path !== 'string' || !f.path.startsWith('files/')) { errors.push(`Mục tệp không hợp lệ: ${f?.path}`); continue; }
    checkFile(f.path, f.bytes, f.sha256);
    listed.set(f.path.slice('files/'.length), f.sha256);
  }
  if (total > MAX_PACKAGE_BYTES) errors.push('Gói vượt giới hạn dung lượng');
  // Không chấp nhận symlink ở bất kỳ đâu trong gói
  const walk = (/** @type {string} */ d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isSymbolicLink()) errors.push(`Gói chứa symlink: ${path.relative(dir, p)}`);
      else if (ent.isDirectory()) walk(p);
    }
  };
  walk(dir);
  /** @type {Record<string, number> | null} */
  let counts = null;
  if (!errors.some((e) => e.includes('db.sqlite'))) {
    let db;
    try {
      db = new DatabaseSync(path.join(dir, 'db.sqlite'), { readOnly: true });
      const ic = /** @type {any} */ (db.prepare('PRAGMA integrity_check').get());
      if (ic?.integrity_check !== 'ok') errors.push('integrity_check thất bại');
      const fk = db.prepare('PRAGMA foreign_key_check').all();
      if (fk.length) errors.push(`Có ${fk.length} liên kết khóa ngoại lỗi`);
      counts = tableCounts(db);
      for (const [t, n] of Object.entries(manifest.counts ?? {})) if (counts[t] !== n) errors.push(`Số bản ghi bảng ${t} không khớp (${counts[t]} ≠ ${n})`);
      if (currentSchemaVersion(db) !== manifest.schema_version) errors.push('schema_version trong CSDL khác manifest');
      const missingAtBackup = new Set(manifest.missing_files ?? []);
      for (const a of /** @type {any[]} */ (db.prepare('SELECT stored_relative_path, sha256 FROM attachments').all())) {
        if (missingAtBackup.has(a.stored_relative_path)) { warnings.push(`Tệp đã thiếu từ lúc sao lưu: ${a.stored_relative_path}`); continue; }
        const s = listed.get(a.stored_relative_path);
        if (!s) errors.push(`Bản ghi tệp không có trong gói: ${a.stored_relative_path}`);
        else if (s !== a.sha256) errors.push(`Checksum tệp khác với CSDL: ${a.stored_relative_path}`);
      }
    } catch (e) {
      errors.push('Không mở được CSDL trong gói: ' + /** @type {Error} */ (e).message);
    } finally {
      db?.close();
    }
  }
  return { ok: errors.length === 0, errors, warnings, manifest, counts };
}

/** @param {import('./app.mjs').App} app @param {string} name */
export function packageDir(app, name) {
  if (!NAME_RE.test(name)) throw new HttpError(400, 'Tên gói sao lưu không hợp lệ');
  const dir = path.join(app.backupsDir, name);
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) throw new HttpError(404, 'Không tìm thấy gói sao lưu');
  return dir;
}

/** @param {import('./app.mjs').App} app */
export function listBackups(app) {
  if (!fs.existsSync(app.backupsDir)) return [];
  return fs.readdirSync(app.backupsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && NAME_RE.test(d.name))
    .map((d) => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(app.backupsDir, d.name, 'manifest.json'), 'utf8'));
        return { name: d.name, created_at: m.created_at, created_at_local: m.created_at_local, schema_version: m.schema_version, counts: m.counts, file_count: m.files?.length ?? 0, missing_files: m.missing_files?.length ?? 0 };
      } catch {
        return { name: d.name, error: 'manifest hỏng hoặc thiếu' };
      }
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

/** @param {string} src @param {string} dest */
function copyTree(src, dest) {
  fs.cpSync(src, dest, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
}

/** Diễn tập: chép gói vào data/restore-test/… và đối chiếu, KHÔNG đụng dữ liệu thật. @param {import('./app.mjs').App} app @param {string} name */
export function restoreTest(app, name) {
  const dir = packageDir(app, name);
  const before = verifyPackage(dir);
  if (!before.ok) return { ok: false, stage: 'kiểm tra gói', errors: before.errors };
  const target = path.join(app.dataDir, 'restore-test', `${name}__${Date.now()}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  copyTree(dir, target);
  const after = verifyPackage(target);
  const db = new DatabaseSync(path.join(target, 'db.sqlite'), { readOnly: true });
  const sample = {
    documents: db.prepare('SELECT id, title FROM documents ORDER BY updated_at DESC LIMIT 3').all(),
    tasks: db.prepare('SELECT id, title FROM tasks ORDER BY updated_at DESC LIMIT 3').all(),
  };
  db.close();
  return {
    ok: after.ok, stage: 'diễn tập', target: path.relative(app.root, target).replace(/\\/g, '/'), errors: after.errors, warnings: after.warnings,
    counts: after.counts, files_checked: after.manifest?.files?.length ?? 0, sample,
  };
}

/**
 * Khôi phục vào dữ liệu thật: kiểm tra → sao lưu hiện trạng → dựng vùng tạm → kiểm tra → hoán đổi → kiểm tra lại; lỗi thì rollback.
 * @param {import('./app.mjs').App} app @param {string} name @param {string} confirm
 */
export function restoreLive(app, name, confirm) {
  if (app.mode !== 'real') throw new HttpError(409, 'Hãy thoát chế độ minh họa trước khi khôi phục.');
  const dir = packageDir(app, name);
  if (confirm !== `KHOI PHUC ${name}`) throw new HttpError(400, `Cần gõ chính xác: KHOI PHUC ${name}`);
  const check = verifyPackage(dir);
  if (!check.ok) throw new HttpError(422, 'Gói không hợp lệ, KHÔNG thay dữ liệu: ' + check.errors.slice(0, 5).join('; '));
  const pre = createBackup(app, 'truoc_khoi_phuc');
  const stamp = Date.now();
  const real = app.paths('real');
  const staging = path.join(app.dataDir, `.restore_staging_${stamp}`);
  const rollback = path.join(app.dataDir, '_rollback', `${stamp}`);
  app.busy = 'khôi phục dữ liệu';
  let swapped = false;
  try {
    fs.mkdirSync(path.join(staging, 'db'), { recursive: true });
    fs.copyFileSync(path.join(dir, 'db.sqlite'), path.join(staging, 'db', path.basename(real.dbFile)));
    fs.mkdirSync(path.join(staging, 'files'), { recursive: true });
    if (fs.existsSync(path.join(dir, 'files'))) copyTree(path.join(dir, 'files'), path.join(staging, 'files'));
    for (const f of check.manifest.files) {
      if (sha256FileSync(path.join(staging, f.path)) !== f.sha256) throw new Error(`Vùng tạm sai checksum: ${f.path}`);
    }
    app.close();
    fs.mkdirSync(rollback, { recursive: true });
    fs.renameSync(path.dirname(real.dbFile), path.join(rollback, 'db'));
    fs.renameSync(real.filesDir, path.join(rollback, 'files'));
    swapped = true;
    fs.renameSync(path.join(staging, 'db'), path.dirname(real.dbFile));
    fs.renameSync(path.join(staging, 'files'), real.filesDir);
    fs.rmSync(staging, { recursive: true, force: true });
    app.open('real');
    const counts = tableCounts(app.db);
    for (const [t, n] of Object.entries(check.manifest.counts)) {
      if (t !== 'schema_migrations' && counts[t] !== n) throw new Error(`Sau khôi phục số bản ghi ${t} không khớp`);
    }
    return { ok: true, restored: name, pre_restore_backup: pre.name, rollback_dir: path.relative(app.root, rollback).replace(/\\/g, '/'), counts };
  } catch (e) {
    // Trả về dữ liệu trước khi khôi phục
    app.close();
    if (swapped) {
      fs.rmSync(path.dirname(real.dbFile), { recursive: true, force: true });
      fs.rmSync(real.filesDir, { recursive: true, force: true });
      fs.renameSync(path.join(rollback, 'db'), path.dirname(real.dbFile));
      fs.renameSync(path.join(rollback, 'files'), real.filesDir);
    }
    fs.rmSync(staging, { recursive: true, force: true });
    app.open('real');
    throw new HttpError(500, 'Khôi phục thất bại, đã trả lại dữ liệu trước đó: ' + /** @type {Error} */ (e).message);
  } finally {
    app.busy = null;
  }
}
