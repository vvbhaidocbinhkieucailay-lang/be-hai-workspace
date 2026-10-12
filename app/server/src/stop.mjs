// @ts-check
// Dừng đúng máy chủ của dự án (đọc data/run/server.json, gọi API tắt). Không tắt tiến trình khác.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.NMW_ROOT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
const info = path.join(root, 'data/run/server.json');
if (!fs.existsSync(info)) {
  console.log('Không thấy máy chủ đang chạy (thiếu data/run/server.json).');
  process.exit(0);
}
const { port } = JSON.parse(fs.readFileSync(info, 'utf8'));
try {
  const r = await fetch(`http://127.0.0.1:${port}/api/system/shutdown`, { method: 'POST', headers: { 'X-Requested-With': 'NMW', 'Content-Type': 'application/json' }, body: '{}' });
  console.log(r.ok ? `Đã gửi lệnh dừng tới máy chủ cổng ${port}.` : `Máy chủ trả lỗi ${r.status}.`);
} catch {
  console.log(`Không kết nối được cổng ${port}; có thể máy chủ đã dừng. Xóa tệp trạng thái cũ.`);
  fs.rmSync(info, { force: true });
}
