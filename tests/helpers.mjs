// Khởi động máy chủ thật trên thư mục dữ liệu tạm (tách hoàn toàn khỏi data/ thật của dự án).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(PROJECT, 'app/server/src/index.mjs');
let portSeq = 5600 + Math.floor(Math.random() * 300);

export function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nmw-test-'));
  fs.copyFileSync(path.join(PROJECT, 'package.json'), path.join(dir, 'package.json'));
  return dir;
}

export async function startServer(root) {
  const port = portSeq++;
  const proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', ENTRY], {
    env: { ...process.env, NMW_ROOT: root, NMW_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/api/system/info`);
      if (r.ok) break;
    } catch { /* chưa sẵn sàng */ }
    if (proc.exitCode !== null) throw new Error('Máy chủ thoát sớm: ' + log);
    await new Promise((r) => setTimeout(r, 100));
  }
  const api = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'NMW', ...headers },
      body: method === 'GET' ? undefined : body instanceof Uint8Array || Buffer.isBuffer(body) ? body : JSON.stringify(body ?? {}),
    });
    let data = null;
    const text = await r.text();
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, headers: r.headers };
  };
  const stop = () => new Promise((resolve) => {
    if (proc.exitCode !== null) return resolve();
    proc.once('exit', resolve);
    fetch(`${base}/api/system/shutdown`, { method: 'POST', headers: { 'X-Requested-With': 'NMW' } }).catch(() => proc.kill());
  });
  return { base, port, proc, api, stop, log: () => log };
}

export function todayVN() {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}
export function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
