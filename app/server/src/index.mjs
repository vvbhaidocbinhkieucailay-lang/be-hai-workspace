// @ts-check
// Điểm khởi động máy chủ: chỉ lắng nghe 127.0.0.1, phục vụ API + giao diện cùng origin.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\n[LỖI] Cần Node.js >= 22.13 (khuyên dùng bản LTS 24). Máy đang có ${process.version}.`);
  console.error('Tải tại https://nodejs.org/ (bản LTS), cài xong mở lại cửa sổ lệnh.\n');
  process.exit(1);
}

const { default: fs } = await import('node:fs');
const { spawn } = await import('node:child_process');
const { default: path } = await import('node:path');
const { createApp } = await import('./app.mjs');
const { createHttpServer } = await import('./http.mjs');
const { registerDocuments } = await import('./routes/documents.mjs');
const { registerFiles } = await import('./routes/files.mjs');
const { registerWork } = await import('./routes/work.mjs');
const { registerOverview } = await import('./routes/overview.mjs');
const { registerSystem } = await import('./routes/system.mjs');
const { createBackup } = await import('./backup.mjs');

const app = createApp();
const LOG = path.join(app.runDir, 'server.log');
/** Ghi nhật kí máy chủ vào data/run/server.log (để chẩn đoán lỗi kết nối). @param {...any} a */
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.map((x) => (x instanceof Error ? x.stack ?? x.message : String(x))).join(' ')}\n`;
  try { fs.mkdirSync(app.runDir, { recursive: true }); fs.appendFileSync(LOG, line); } catch { /* bỏ qua */ }
}

/** @param {string} url */
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    const child = spawn(/** @type {string} */ (cmd[0]), /** @type {string[]} */ (cmd[1]), { stdio: 'ignore', detached: true, windowsVerbatimArguments: true });
    child.on('error', (e) => log('Không tự mở được trình duyệt:', e.message)); // không để lỗi này làm sập máy chủ
    child.unref();
  } catch (e) { log('Không tự mở được trình duyệt:', e); }
}

// Lỗi bất ngờ: ghi nhật kí và GIỮ máy chủ chạy (trước đây có thể làm máy chủ tắt → trình duyệt báo "Không kết nối được")
process.on('uncaughtException', (e) => { log('[uncaughtException]', e); console.error('[LỖI]', e?.message ?? e); });
process.on('unhandledRejection', (e) => { log('[unhandledRejection]', e); console.error('[LỖI]', e); });

// Chỉ một máy chủ cho một thư mục dữ liệu: nếu đã chạy sẵn thì mở trình duyệt tới đúng địa chỉ đó và thoát.
const runInfo = path.join(app.runDir, 'server.json');
if (fs.existsSync(runInfo)) {
  try {
    const old = JSON.parse(fs.readFileSync(runInfo, 'utf8'));
    const r = await fetch(`http://127.0.0.1:${old.port}/api/system/info`, { signal: AbortSignal.timeout(1500) });
    const info = r.ok ? await r.json() : null;
    if (info?.root_abs && path.resolve(info.root_abs) === path.resolve(app.root)) {
      console.log(`Máy chủ đã chạy sẵn tại ${old.url} – mở trình duyệt tới địa chỉ này.`);
      if (process.argv.includes('--open')) openBrowser(old.url);
      // Trên Windows, thoát ngay sau fetch có thể làm libuv phát hiện handle đang đóng
      // (0xC0000409). Cho undici dọn connection trước khi kết thúc tiến trình phụ.
      await new Promise((resolve) => setTimeout(resolve, 50));
      process.exit(0);
    }
  } catch { /* máy chủ cũ không còn chạy (đã tắt cửa sổ) – khởi động mới */ }
}

// Trước khi migration trên CSDL đã có dữ liệu: tạo bản sao lưu (SOP-02 bước 2)
app.onBeforeMigrate = (db, from, to) => {
  app.db = db;
  app.filesDir = app.paths('real').filesDir;
  const r = createBackup(app, `truoc_migration_${from}_${to}`);
  console.log(`[SAO LƯU] Đã sao lưu trước migration: backups/${r.name}`);
  log('Sao lưu trước migration', r.name);
};

/** @type {import('node:http').Server} */
let server;
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log('Đang dừng máy chủ…');
  log('Dừng máy chủ');
  server?.close(() => {
    app.close();
    try { fs.rmSync(runInfo, { force: true }); } catch { /* bỏ qua */ }
    console.log('Đã dừng.');
    process.exit(0);
  });
  setTimeout(() => { app.close(); process.exit(0); }, 3000).unref();
}

registerDocuments();
registerFiles();
registerWork();
registerOverview();
registerSystem(shutdown);

try {
  app.open('real');
} catch (e) {
  log('Không mở được dữ liệu', e);
  console.error('[LỖI] Không mở được dữ liệu:', /** @type {Error} */ (e).message);
  process.exit(1);
}

const basePort = Number(process.env.NMW_PORT || 5178);
const tries = process.env.NMW_PORT ? 1 : 10;

/** @param {number} port @returns {Promise<boolean>} */
function tryListen(port) {
  return new Promise((resolve) => {
    app.port = port;
    server = createHttpServer(app);
    server.once('error', (/** @type {any} */ err) => {
      if (err.code === 'EADDRINUSE') { console.log(`Cổng ${port} đang được chương trình khác dùng, thử cổng tiếp theo…`); resolve(false); }
      else { log('Lỗi mở cổng', err); console.error('[LỖI]', err.message); process.exit(1); }
    });
    server.listen(port, '127.0.0.1', () => resolve(true));
  });
}

let ok = false;
for (let i = 0; i < tries && !ok; i++) ok = await tryListen(basePort + i);
if (!ok) {
  console.error(`[LỖI] Không tìm được cổng trống (${basePort}…${basePort + tries - 1}). Đặt cổng khác: set NMW_PORT=5300 rồi chạy lại.`);
  process.exit(1);
}
server.on('error', (e) => log('[server error]', e));
server.on('clientError', (e, socket) => { try { socket.destroy(); } catch { /* bỏ qua */ } });
const url = `http://127.0.0.1:${app.port}/`;
fs.writeFileSync(runInfo, JSON.stringify({ pid: process.pid, port: app.port, url, root: app.root, started_at: new Date().toISOString() }, null, 2));
log(`Khởi động ${url} · Node ${process.version} · dữ liệu ${app.dataDir}`);
console.log('');
console.log('  KHÔNG GIAN LÀM VIỆC BÉ HAI đang chạy');
console.log(`  Địa chỉ: ${url}`);
console.log(`  Dữ liệu: ${app.dataDir}`);
console.log('  GIỮ CỬA SỔ NÀY MỞ (có thể thu nhỏ). Đóng cửa sổ = tắt máy chủ.');
console.log('  Dừng: nhấn Ctrl + C ở đây hoặc chạy DUNG.bat');
console.log('');

if (process.argv.includes('--open')) openBrowser(url);

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
