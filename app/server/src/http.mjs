// @ts-check
// Máy chủ HTTP: định tuyến API, kiểm tra Host/Origin, phục vụ giao diện đã build (cùng origin).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { CLIENT_DIST } from './app.mjs';
import { HttpError } from './util.mjs';

/**
 * @typedef {{
 *   app: import('./app.mjs').App,
 *   db: import('node:sqlite').DatabaseSync,
 *   req: http.IncomingMessage, res: http.ServerResponse,
 *   params: Record<string, string>, query: URLSearchParams, body: any,
 * }} Ctx
 * @typedef {(ctx: Ctx) => any} Handler
 * @typedef {{method: string, re: RegExp, keys: string[], handler: Handler, raw?: boolean}} Route
 */

/** @type {Route[]} */
const routes = [];

/** @param {string} method @param {string} pattern @param {Handler} handler @param {{raw?: boolean}} [opt] */
export function route(method, pattern, handler, opt = {}) {
  /** @type {string[]} */
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([A-Za-z0-9_\\-]+)'; }) + '$');
  routes.push({ method, re, keys, handler, raw: opt.raw });
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

/** @param {http.ServerResponse} res @param {number} status @param {any} data */
export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

/** @param {http.IncomingMessage} req @param {number} limit */
function readJson(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Dữ liệu gửi lên quá lớn')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'JSON không hợp lệ')); }
    });
    req.on('error', reject);
  });
}

/** Chỉ chấp nhận Host là loopback đúng cổng (chống DNS rebinding). @param {import('./app.mjs').App} app @param {http.IncomingMessage} req */
function hostAllowed(app, req) {
  const host = (req.headers.host ?? '').toLowerCase();
  return host === `127.0.0.1:${app.port}` || host === `localhost:${app.port}`;
}

/** Yêu cầu ghi: phải có header X-Requested-With: NMW và Origin (nếu có) trùng origin cục bộ. */
function writeAllowed(/** @type {import('./app.mjs').App} */ app, /** @type {http.IncomingMessage} */ req) {
  if (req.headers['x-requested-with'] !== 'NMW') return false;
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${app.port}` && origin !== `http://localhost:${app.port}`) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  return true;
}

const MIME = /** @type {Record<string,string>} */ ({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
});

/** @param {http.IncomingMessage} req @param {http.ServerResponse} res @param {string} pathname */
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Phương thức không được hỗ trợ' });
  const index = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(index)) {
    res.writeHead(503, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Chưa có bản build giao diện (app/client/dist). Chạy: npm run build');
  }
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { rel = '/'; }
  const file = path.resolve(CLIENT_DIST, '.' + rel);
  const inside = file.startsWith(CLIENT_DIST + path.sep);
  if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    return req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res);
  }
  if (path.extname(rel)) return sendJson(res, 404, { error: 'Không tìm thấy' });
  // Định tuyến phía giao diện (SPA): trả index.html
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  return req.method === 'HEAD' ? res.end() : fs.createReadStream(index).pipe(res);
}

/** @param {import('./app.mjs').App} app */
export function createHttpServer(app) {
  return http.createServer(async (req, res) => {
    try {
      if (!hostAllowed(app, req)) return sendJson(res, 421, { error: 'Host không hợp lệ. Hãy mở bằng http://127.0.0.1:' + app.port });
      const u = new URL(req.url ?? '/', `http://127.0.0.1:${app.port}`);
      if (!u.pathname.startsWith('/api/')) return serveStatic(req, res, u.pathname);
      const method = req.method ?? 'GET';
      if (method === 'OPTIONS') return sendJson(res, 405, { error: 'Không hỗ trợ truy cập khác nguồn' });
      const isWrite = !['GET', 'HEAD'].includes(method);
      if (isWrite && !writeAllowed(app, req)) return sendJson(res, 403, { error: 'Yêu cầu ghi bị từ chối (nguồn không hợp lệ)' });
      /** @type {Route | undefined} */
      let found;
      /** @type {RegExpExecArray | null} */
      let m = null;
      for (const r of routes) {
        if (r.method !== method) continue;
        m = r.re.exec(u.pathname);
        if (m) { found = r; break; }
      }
      if (!found || !m) return sendJson(res, 404, { error: 'Không tìm thấy API' });
      if (isWrite && app.busy && !u.pathname.startsWith('/api/system/')) {
        return sendJson(res, 503, { error: `Đang ${app.busy}, tạm khóa thao tác ghi. Vui lòng thử lại sau ít giây.` });
      }
      /** @type {Record<string,string>} */
      const params = {};
      found.keys.forEach((k, i) => { params[k] = /** @type {RegExpExecArray} */ (m)[i + 1]; });
      const body = isWrite && !found.raw ? await readJson(req) : undefined;
      const ctx = { app, db: app.db, req, res, params, query: u.searchParams, body };
      const result = await found.handler(ctx);
      if (res.headersSent || res.writableEnded) return;
      sendJson(res, method === 'POST' && result?.__created ? 201 : 200, result?.__created ? result.data : result ?? { ok: true });
    } catch (e) {
      const err = /** @type {any} */ (e);
      if (res.headersSent) { res.destroy(); return; }
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message, fields: err.fields });
      const msg = String(err?.message ?? err);
      if (/current_version_mismatch/.test(msg)) return sendJson(res, 400, { error: 'Phiên bản không thuộc tài liệu này' });
      if (/CHECK constraint failed/.test(msg)) return sendJson(res, 400, { error: 'Dữ liệu không thỏa ràng buộc: ' + msg.replace(/^.*CHECK constraint failed:\s*/, '') });
      if (/FOREIGN KEY constraint failed/.test(msg)) return sendJson(res, 400, { error: 'Liên kết tới bản ghi không tồn tại' });
      console.error('[LỖI]', err);
      return sendJson(res, 500, { error: 'Lỗi máy chủ: ' + msg });
    }
  });
}

/** @param {any} data */
export const created = (data) => ({ __created: true, data });
