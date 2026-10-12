// @ts-check
// Ngữ cảnh ứng dụng: đường dẫn dữ liệu (tương đối với gốc dự án), CSDL đang mở, chế độ thật/minh họa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(HERE, '../../..');
export const CLIENT_DIST = path.join(PROJECT_ROOT, 'app/client/dist');
export const APP_VERSION = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;

/**
 * @typedef {'real' | 'demo'} Mode
 * @typedef {{
 *   root: string, dataDir: string, backupsDir: string, runDir: string,
 *   mode: Mode, db: import('node:sqlite').DatabaseSync, filesDir: string, dbFile: string,
 *   busy: string | null, port: number,
 *   paths: (mode: Mode) => {dbFile: string, filesDir: string},
 *   open: (mode: Mode) => void, close: () => void,
 *   onBeforeMigrate?: (db: import('node:sqlite').DatabaseSync, from: number, to: number) => void,
 * }} App
 */

/** @param {{root?: string}} [opt] @returns {App} */
export function createApp(opt = {}) {
  const root = path.resolve(opt.root ?? process.env.NMW_ROOT ?? PROJECT_ROOT);
  const dataDir = path.join(root, 'data');
  /** @type {App} */
  const app = /** @type {any} */ ({
    root,
    dataDir,
    backupsDir: path.join(root, 'backups'),
    runDir: path.join(dataDir, 'run'),
    mode: 'real',
    busy: null,
    port: 0,
    paths(mode) {
      return mode === 'demo'
        ? { dbFile: path.join(dataDir, 'demo/db/demo.sqlite'), filesDir: path.join(dataDir, 'demo/files') }
        : { dbFile: path.join(dataDir, 'db/nmw.sqlite'), filesDir: path.join(dataDir, 'files') };
    },
    open(mode) {
      const p = app.paths(mode);
      for (const d of [path.dirname(p.dbFile), p.filesDir, path.join(p.filesDir, 'tmp'), app.backupsDir, app.runDir,
        path.join(dataDir, 'imports'), path.join(dataDir, 'exports')]) fs.mkdirSync(d, { recursive: true });
      app.db = openDatabase(p.dbFile, { beforeMigrate: mode === 'real' ? app.onBeforeMigrate : undefined });
      app.mode = mode;
      app.dbFile = p.dbFile;
      app.filesDir = p.filesDir;
    },
    close() {
      try { app.db?.close(); } catch { /* đã đóng */ }
    },
  });
  return app;
}
