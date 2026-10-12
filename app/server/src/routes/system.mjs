// @ts-check
// Thông tin hệ thống, chế độ minh họa (CSDL + kho tệp riêng), sao lưu/khôi phục, tắt máy chủ.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION } from '../app.mjs';
import { createBackup, listBackups, packageDir, restoreLive, restoreTest, verifyPackage } from '../backup.mjs';
import { LATEST_SCHEMA, currentSchemaVersion, tableCounts } from '../db.mjs';
import { created, route } from '../http.mjs';
import { seedDemo } from '../demo.mjs';
import { HttpError, TIMEZONE, isLocalPath, oneOf, str, todayVN } from '../util.mjs';

/** @param {() => void} onShutdown */
export function registerSystem(onShutdown) {
  route('GET', '/api/system/info', ({ app }) => ({
    app: 'KHÔNG GIAN LÀM VIỆC NGỌC MAI', version: APP_VERSION, mode: app.mode, busy: app.busy,
    schema_version: currentSchemaVersion(app.db), latest_schema: LATEST_SCHEMA, today: todayVN(), timezone: TIMEZONE,
    node: process.version, listen: `127.0.0.1:${app.port}`,
    data: { db: 'data/db/nmw.sqlite', files: 'data/files', backups: 'backups', demo: 'data/demo' },
    root_abs: app.root, data_abs: app.dataDir, backups_abs: app.backupsDir, platform: process.platform,
    counts: tableCounts(app.db),
  }));

  // Chế độ minh họa: chỉ bật khi người dùng chọn; dữ liệu nằm ở data/demo, tách khỏi dữ liệu thật; khởi động lại luôn về dữ liệu thật.
  route('POST', '/api/system/mode', ({ app, body }) => {
    const mode = oneOf(body, 'mode', /** @type {const} */ (['real', 'demo']));
    if (!mode) throw new HttpError(400, 'Thiếu chế độ');
    if (app.busy) throw new HttpError(503, `Đang ${app.busy}`);
    if (mode === app.mode) return { mode };
    app.close();
    app.open(mode);
    if (mode === 'demo') seedDemo(app.db);
    return { mode: app.mode };
  });

  // Mở thư mục trong File Explorer (chỉ mở/chọn, KHÔNG chạy tệp). Dùng cho trường "đường dẫn thư mục" và các thư mục dữ liệu.
  route('POST', '/api/system/open-path', ({ app, body }) => {
    const targets = /** @type {Record<string,string>} */ ({ root: app.root, data: app.dataDir, files: app.filesDir, backups: app.backupsDir });
    let p = body?.target ? targets[String(body.target)] : str(body, 'path', { required: true, max: 2000, label: 'đường dẫn' });
    if (!p) throw new HttpError(400, 'Thư mục không hợp lệ');
    if (!body?.target && !isLocalPath(p)) throw new HttpError(400, 'Chỉ mở được đường dẫn trên máy, dạng D:\\Thư mục\\…');
    if (/["<>|?*\u0000-\u001f]/.test(p.slice(2))) throw new HttpError(400, 'Đường dẫn chứa kí tự không hợp lệ');
    if (process.platform === 'win32' || body?.target) p = path.resolve(p);
    let st;
    try { st = fs.statSync(p); } catch { throw new HttpError(404, `Không tìm thấy trên máy: ${p}. Kiểm tra ổ đĩa (vd. ổ D) và tên thư mục.`); }
    if (process.platform !== 'win32') return { ok: false, path: p, message: 'Chỉ mở được File Explorer khi máy chủ chạy trên Windows. Hãy sao chép đường dẫn.' };
    const arg = st.isDirectory() ? `"${p}"` : `/select,"${p}"`; // tệp: mở thư mục chứa và chọn tệp, không chạy tệp
    const child = spawn('explorer.exe', [arg], { windowsVerbatimArguments: true, detached: true, stdio: 'ignore' });
    child.on('error', () => { /* đã báo qua kết quả trả về */ });
    child.unref();
    return { ok: true, path: p, kind: st.isDirectory() ? 'folder' : 'file' };
  });

  // Tự chạy cùng Windows + lối tắt màn hình nền (để lần sau không phải bấm KHOI_DONG.bat)
  const ps = (/** @type {string} */ root, /** @type {string} */ action) => execFileSync('powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'app', 'scripts', 'tu-khoi-dong.ps1'), '-Action', action],
    { encoding: 'utf8', timeout: 20000, windowsHide: true }).trim();
  route('GET', '/api/system/autostart', ({ app }) => {
    if (process.platform !== 'win32') return { supported: false, message: 'Chỉ dùng được khi máy chủ chạy trên Windows.' };
    try { return { supported: true, ...JSON.parse(ps(app.root, 'trangthai')) }; } catch (e) { return { supported: true, error: String(/** @type {Error} */ (e).message).slice(0, 300) }; }
  });
  route('POST', '/api/system/autostart', ({ app, body }) => {
    if (process.platform !== 'win32') throw new HttpError(501, 'Chỉ bật được khi máy chủ chạy trên Windows. Hãy chạy CAI_TU_KHOI_DONG.bat.');
    try {
      const message = ps(app.root, body?.enable ? 'bat' : 'tat');
      return { ok: true, message, ...JSON.parse(ps(app.root, 'trangthai')) };
    } catch (e) {
      throw new HttpError(500, 'Không thực hiện được (có thể Windows chặn PowerShell). Hãy chạy CAI_TU_KHOI_DONG.bat. Chi tiết: ' + String(/** @type {any} */ (e).stdout || /** @type {Error} */ (e).message).slice(0, 300));
    }
  });

  route('POST', '/api/system/shutdown', ({ res }) => {
    res.on('finish', () => setTimeout(onShutdown, 50));
    return { ok: true, message: 'Máy chủ đang dừng' };
  });

  route('GET', '/api/backups', ({ app }) => ({ items: listBackups(app), mode: app.mode }));
  route('POST', '/api/backups', ({ app, body }) => {
    const r = createBackup(app, str(body, 'label', { max: 40 }) ?? undefined);
    return created({ name: r.name, created_at_local: r.manifest.created_at_local, counts: r.manifest.counts, files: r.manifest.files.length, missing_files: r.manifest.missing_files, verify: { ok: r.verify.ok, errors: r.verify.errors, warnings: r.verify.warnings } });
  });
  route('POST', '/api/backups/:name/verify', ({ app, params }) => {
    const v = verifyPackage(packageDir(app, params.name));
    return { ok: v.ok, errors: v.errors, warnings: v.warnings, counts: v.counts, files: v.manifest?.files?.length ?? 0 };
  });
  route('POST', '/api/backups/:name/restore-test', ({ app, params }) => restoreTest(app, params.name));
  route('POST', '/api/backups/:name/restore', ({ app, params, body }) => restoreLive(app, params.name, String(body?.confirm ?? '')));
  route('GET', '/api/backups/:name/manifest', ({ app, params }) => JSON.parse(fs.readFileSync(`${packageDir(app, params.name)}/manifest.json`, 'utf8')));
}
