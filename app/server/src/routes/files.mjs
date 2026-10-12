// @ts-check
// Tải tệp lên/xuống qua máy chủ cục bộ. Tệp lưu bằng ID trong data/files; tên gốc chỉ là metadata.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { created, route } from '../http.mjs';
import { HttpError, newId, nowIso, tx } from '../util.mjs';
import { documentDetail, getDocRow, rebuildDocSearch } from './documents.mjs';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Định dạng được phép và kiểu MIME. Không nhận HTML/SVG/JS/EXE… để tránh thực thi. */
export const ALLOWED = /** @type {Record<string, string>} */ ({
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', rtf: 'application/rtf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp3: 'audio/mpeg', mp4: 'video/mp4', zip: 'application/zip',
});

/** Chữ kí đầu tệp tối thiểu để phát hiện tệp đổi đuôi. */
const MAGIC = /** @type {Record<string, (b: Buffer) => boolean>} */ ({
  pdf: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8,
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8,
  gif: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  docx: (b) => b[0] === 0x50 && b[1] === 0x4b, xlsx: (b) => b[0] === 0x50 && b[1] === 0x4b, pptx: (b) => b[0] === 0x50 && b[1] === 0x4b,
  odt: (b) => b[0] === 0x50 && b[1] === 0x4b, ods: (b) => b[0] === 0x50 && b[1] === 0x4b, odp: (b) => b[0] === 0x50 && b[1] === 0x4b,
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b,
});

/** Làm sạch tên gốc: bỏ thư mục, kí tự điều khiển, giới hạn độ dài. @param {string} raw */
export function sanitizeName(raw) {
  let name = raw.replace(/\\/g, '/').split('/').pop() ?? '';
  name = name.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').replace(/^\.+/, '').trim();
  if (name.length > 180) {
    const ext = path.extname(name).slice(0, 10);
    name = name.slice(0, 180 - ext.length) + ext;
  }
  return name || 'tep';
}

export function registerFiles() {
  // Thân yêu cầu là nội dung tệp (application/octet-stream); tên tệp trong header X-File-Name (encodeURIComponent).
  route('POST', '/api/documents/:id/upload', async ({ app, db, req, params, query }) => {
    getDocRow(db, params.id);
    let rawName = '';
    try { rawName = decodeURIComponent(String(req.headers['x-file-name'] ?? '')); } catch { throw new HttpError(400, 'Tên tệp không hợp lệ'); }
    const original = sanitizeName(rawName);
    const ext = path.extname(original).slice(1).toLowerCase();
    if (!ALLOWED[ext]) throw new HttpError(415, `Không nhận định dạng .${ext || '?'} . Cho phép: ${Object.keys(ALLOWED).join(', ')}`);
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > MAX_UPLOAD_BYTES) throw new HttpError(413, 'Tệp vượt quá 50 MB');

    const versionId = query.get('version_id');
    if (versionId) {
      const v = db.prepare('SELECT 1 FROM document_versions WHERE id = ? AND document_id = ?').get(versionId, params.id);
      if (!v) throw new HttpError(400, 'Phiên bản không thuộc tài liệu này');
    }
    const attId = newId('att');
    const now = new Date();
    const rel = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${attId}.${ext}`;
    const tmp = path.join(app.filesDir, 'tmp', `${attId}.part`);
    const dest = path.join(app.filesDir, rel);
    if (!path.resolve(dest).startsWith(path.resolve(app.filesDir) + path.sep)) throw new HttpError(400, 'Đường dẫn không hợp lệ');

    const hash = crypto.createHash('sha256');
    let bytes = 0;
    /** @type {Buffer | null} */
    let head = null;
    const meter = new Transform({
      transform(chunk, _enc, cb) {
        bytes += chunk.length;
        if (bytes > MAX_UPLOAD_BYTES) return cb(new HttpError(413, 'Tệp vượt quá 50 MB'));
        if (!head) head = Buffer.from(chunk.subarray(0, 16));
        hash.update(chunk);
        cb(null, chunk);
      },
    });
    try {
      await pipeline(req, meter, fs.createWriteStream(tmp, { flags: 'wx' }));
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      throw e instanceof HttpError ? e : new HttpError(400, 'Tải tệp bị gián đoạn, chưa lưu gì. Vui lòng thử lại.');
    }
    if (bytes === 0) { fs.rmSync(tmp, { force: true }); throw new HttpError(400, 'Tệp rỗng'); }
    const check = MAGIC[ext];
    if (check && !check(/** @type {Buffer} */ (head))) { fs.rmSync(tmp, { force: true }); throw new HttpError(415, `Nội dung tệp không khớp đuôi .${ext}`); }
    const sha256 = hash.digest('hex');
    const duplicates = db.prepare(`SELECT d.id AS document_id, d.title, a.original_name FROM attachments a JOIN document_versions v ON v.id = a.version_id
      JOIN documents d ON d.id = v.document_id WHERE a.sha256 = ?`).all(sha256);

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(tmp, dest);
    try {
      tx(db, () => {
        let vid = versionId;
        if (!vid) {
          vid = newId('ver');
          const n = Number(/** @type {any} */ (db.prepare('SELECT COUNT(*) AS n FROM document_versions WHERE document_id = ?').get(params.id)).n);
          const label = (query.get('version_label') ?? '').trim().slice(0, 60) || `Bản ${n + 1}`;
          db.prepare('INSERT INTO document_versions (id, document_id, version_label, notes, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(vid, params.id, label, (query.get('notes') ?? '').slice(0, 2000) || null, now.toISOString());
          if (query.get('make_current') !== '0') db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(vid, params.id);
        }
        db.prepare('INSERT INTO attachments (id, version_id, stored_relative_path, original_name, mime, bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(attId, vid, rel, original, ALLOWED[ext], bytes, sha256, now.toISOString());
        db.prepare('UPDATE documents SET updated_at = ? WHERE id = ?').run(nowIso(), params.id);
        rebuildDocSearch(db, params.id);
      });
    } catch (e) {
      fs.rmSync(dest, { force: true }); // không để tệp mồ côi khi ghi CSDL lỗi
      throw e;
    }
    return created({ attachment: { id: attId, original_name: original, bytes, sha256 }, duplicates, document: documentDetail(db, params.id) });
  }, { raw: true });

  route('GET', '/api/attachments/:id/download', ({ app, db, res, params }) => {
    const a = /** @type {any} */ (db.prepare(`SELECT a.*, v.document_id FROM attachments a JOIN document_versions v ON v.id = a.version_id WHERE a.id = ?`).get(params.id));
    if (!a) throw new HttpError(404, 'Không tìm thấy tệp');
    const file = path.resolve(app.filesDir, a.stored_relative_path);
    if (!file.startsWith(path.resolve(app.filesDir) + path.sep) || !fs.existsSync(file)) throw new HttpError(404, 'Tệp không còn trong kho data/files. Hãy khôi phục từ bản sao lưu.');
    db.prepare('UPDATE documents SET last_opened_at = ? WHERE id = ?').run(nowIso(), a.document_id);
    const ascii = a.original_name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream', // luôn tải xuống, không hiển thị/thực thi trong trình duyệt
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(a.original_name)}`,
      'Content-Length': fs.statSync(file).size,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'no-store',
      'X-Checksum-SHA256': a.sha256,
    });
    fs.createReadStream(file).pipe(res);
  });
}
