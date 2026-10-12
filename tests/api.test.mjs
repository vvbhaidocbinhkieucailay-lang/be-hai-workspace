// Kiểm thử luồng dữ liệu quan trọng qua API thật (máy chủ thật, CSDL tạm). Chạy: npm test
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { addDays, startServer, tempRoot, todayVN } from './helpers.mjs';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n% Tài liệu thử\n'), crypto.randomBytes(2048), Buffer.from('\n%%EOF\n')]);

async function upload(s, docId, name, buf, q = '') {
  const r = await fetch(`${s.base}/api/documents/${docId}/upload${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Requested-With': 'NMW', 'X-File-Name': encodeURIComponent(name) },
    body: buf,
  });
  return { status: r.status, data: await r.json() };
}

describe('KHÔNG GIAN LÀM VIỆC NGỌC MAI – API', () => {
  let root;
  let s;
  before(async () => {
    root = tempRoot();
    s = await startServer(root);
  });
  after(async () => {
    await s?.stop();
  });

  test('AC-02/FR-01: dữ liệu rỗng – tổng quan không có số giả, chưa đếm ngược', async () => {
    const { status, data } = await s.api('GET', '/api/overview');
    assert.equal(status, 200);
    assert.deepEqual(data.priorities, []);
    assert.equal(data.next_due, null);
    assert.equal(data.thesis.defense.label, '25/10 (chưa xác nhận năm)');
    assert.equal(data.thesis.defense.year, null);
    assert.equal(data.thesis.defense.countdown_days, null);
    assert.equal(data.thesis.progress.percent, null);
    assert.match(data.thesis.progress.label, /Chưa thiết lập/);
    assert.equal(data.modules.lesson.total, 0);
    const wk = new Date(`${data.week.from}T00:00:00Z`).getUTCDay();
    assert.equal(wk, 1, 'tuần bắt đầu thứ Hai');
  });

  test('AC-17: ranh giới cục bộ – sai Origin/Host/thiếu header bị từ chối; chỉ bind 127.0.0.1', async () => {
    const before = (await s.api('GET', '/api/documents')).data.items.length;
    const r1 = await s.api('POST', '/api/documents', { category: 'lesson', title: 'x' }, { Origin: 'http://evil.example' });
    assert.equal(r1.status, 403);
    const r2 = await fetch(`${s.base}/api/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"category":"lesson","title":"x"}' });
    assert.equal(r2.status, 403);
    const r3 = await s.api('POST', '/api/documents', { category: 'lesson', title: 'x' }, { 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(r3.status, 403);
    const { request } = await import('node:http');
    const status = await new Promise((resolve) => {
      const req = request({ host: '127.0.0.1', port: s.port, path: '/api/overview', headers: { Host: 'evil.example' } }, (res) => resolve(res.statusCode));
      req.end();
    });
    assert.equal(status, 421);
    const r4 = await fetch(`${s.base}/api/documents`, { method: 'OPTIONS' });
    assert.equal(r4.headers.get('access-control-allow-origin'), null);
    assert.equal((await s.api('GET', '/api/documents')).data.items.length, before, 'không có bản ghi nào được tạo');
    const ext = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
    if (ext) {
      await assert.rejects(fetch(`http://${ext.address}:${s.port}/api/system/info`), 'không truy cập được qua IP mạng LAN');
    }
  });

  test('AC-03/AC-05: tạo, sửa, lọc, ghim, lưu trữ, khôi phục; một tài liệu nhiều nhãn', async () => {
    const c = await s.api('POST', '/api/documents', {
      category: 'material', title: 'Bộ câu hỏi Tế bào nhân sơ', subject: 'Sinh học', grade: '10', school_year: '2026-2027',
      material_type: 'cau_hoi', tags: ['Tế bào', 'HSG', 'tế bào'],
    });
    assert.equal(c.status, 201);
    const id = c.data.id;
    assert.equal(c.data.tags.length, 2, 'nhãn trùng (khác dấu hoa/thường) gộp lại');
    const byTag1 = (await s.api('GET', '/api/documents?tag=te%20bao')).data.items.map((d) => d.id);
    const byTag2 = (await s.api('GET', '/api/documents?tag=HSG')).data.items.map((d) => d.id);
    assert.deepEqual(byTag1, [id]);
    assert.deepEqual(byTag2, [id]);
    const search = await s.api('GET', '/api/search?q=hsg%20te%20bao');
    assert.equal(search.data.documents.filter((d) => d.id === id).length, 1, 'chỉ một kết quả chính');
    assert.equal(search.data.documents[0].tags.length, 2);
    // lọc AND
    assert.equal((await s.api('GET', '/api/documents?category=material&subject=Sinh%20h%E1%BB%8Dc&grade=10')).data.items.length, 1);
    assert.equal((await s.api('GET', '/api/documents?category=material&subject=Sinh%20h%E1%BB%8Dc&grade=11')).data.items.length, 0);
    // sửa
    const u = await s.api('PUT', `/api/documents/${id}`, { title: 'Bộ câu hỏi Tế bào nhân sơ (sửa)', subject: 'Sinh học', material_type: 'cau_hoi', tags: ['HSG'] });
    assert.equal(u.status, 200);
    assert.equal(u.data.tags.length, 1);
    // ghim
    assert.equal((await s.api('POST', `/api/documents/${id}/pin`, { pinned: true })).data.pinned, true);
    assert.ok((await s.api('GET', '/api/overview')).data.documents.pinned.some((d) => d.id === id));
    // lưu trữ → ẩn khỏi danh sách mặc định → khôi phục
    await s.api('POST', `/api/documents/${id}/archive`);
    assert.equal((await s.api('GET', '/api/documents?category=material')).data.items.length, 0);
    assert.equal((await s.api('GET', '/api/documents?category=material&archived=1')).data.items.length, 1);
    assert.ok((await s.api('GET', '/api/archive')).data.documents.some((d) => d.id === id));
    await s.api('POST', `/api/documents/${id}/restore`);
    assert.equal((await s.api('GET', '/api/documents?category=material')).data.items.length, 1);
  });

  test('FR-02: kế hoạch bài dạy lọc năm học/học kì/trạng thái; liên kết học liệu và lịch dạy', async () => {
    const lp = (await s.api('POST', '/api/documents', {
      category: 'lesson', title: 'Bài 6 Tế bào nhân sơ', subject: 'Sinh học', grade: '10', school_year: '2026-2027',
      lesson: { semester: 'HK1', class_label: '10A1', periods: 2, status: 'san_sang' },
    })).data;
    assert.equal(lp.lesson.status, 'san_sang');
    const bad = await s.api('POST', '/api/documents', { category: 'lesson', title: 'x', lesson: { status: 'xyz' } });
    assert.equal(bad.status, 400);
    assert.equal((await s.api('GET', '/api/documents?category=lesson&school_year=2026-2027&semester=HK1&status=san_sang')).data.items.length, 1);
    assert.equal((await s.api('GET', '/api/documents?category=lesson&semester=HK2')).data.items.length, 0);
    const mat = (await s.api('GET', '/api/documents?category=material')).data.items[0];
    const rel = await s.api('POST', `/api/documents/${lp.id}/relations`, { related_document_id: mat.id });
    assert.equal(rel.data.related.length, 1);
    await s.api('POST', `/api/documents/${mat.id}/relations`, { related_document_id: lp.id });
    assert.equal((await s.api('GET', `/api/documents/${mat.id}`)).data.related.length, 1, 'liên kết hai chiều không nhân bản');
    const ev = await s.api('POST', '/api/events', { title: 'Dạy 10A1', start_date: '2026-10-13', start_time: '07:00', end_time: '07:45', document_id: lp.id });
    assert.equal(ev.status, 201);
    assert.equal((await s.api('GET', `/api/documents/${lp.id}`)).data.events.length, 1);
  });

  test('AC-09: văn bản – mặc định chưa kiểm tra hiệu lực; không cho ghi còn hiệu lực khi thiếu nguồn/ngày', async () => {
    const r = await s.api('POST', '/api/documents', {
      category: 'official', title: 'Công văn thử', source_url: 'https://example.gov.vn/vb',
      summary: 'Tóm tắt cá nhân', official: { number: '123/SGDĐT-GDTrH', issuer: 'Sở GDĐT', issued_date: '2026-09-15', document_type: 'Công văn' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.official.validity_status, 'chua_kiem_tra');
    const bad = await s.api('PUT', `/api/documents/${r.data.id}`, { title: 'Công văn thử', official: { validity_status: 'con_hieu_luc' } });
    assert.equal(bad.status, 400);
    const js = await s.api('POST', '/api/documents', { category: 'official', title: 'x', source_url: 'javascript:alert(1)' });
    assert.equal(js.status, 400, 'chặn link javascript:');
    assert.equal((await s.api('GET', '/api/search?q=123%2FSGDDT')).data.documents.length, 1, 'tìm theo số kí hiệu, không dấu');
  });

  test('AC-10: tải tệp lên/xuống đúng checksum; tên bất thường không thoát data; chặn HTML/đổi đuôi', async () => {
    const doc = (await s.api('POST', '/api/documents', { category: 'material', title: 'Đề thực hành', subject: 'Công nghệ', tech_branch: 'thuy_san' })).data;
    const up = await upload(s, doc.id, '..\\..\\..\\Windows\\đề thi/../../evil.pdf', PDF);
    assert.equal(up.status, 201);
    assert.equal(up.data.attachment.sha256, sha(PDF));
    assert.equal(up.data.attachment.original_name, 'evil.pdf');
    const att = up.data.document.versions.find((v) => v.is_current).attachments[0];
    const dl = await fetch(`${s.base}/api/attachments/${att.id}/download`);
    const buf = Buffer.from(await dl.arrayBuffer());
    assert.equal(sha(buf), sha(PDF));
    assert.equal(dl.headers.get('content-type'), 'application/octet-stream');
    assert.match(dl.headers.get('content-disposition'), /^attachment;/);
    // tệp nằm trong data/files, tên nội bộ theo ID
    const files = fs.readdirSync(path.join(root, 'data/files'), { recursive: true }).filter((f) => f.endsWith('.pdf'));
    assert.equal(files.length, 1);
    assert.match(files[0], /att_[0-9a-f]+\.pdf$/);
    assert.ok(!fs.existsSync(path.join(root, 'evil.pdf')) && !fs.existsSync(path.join(root, '..', 'evil.pdf')));
    assert.equal((await upload(s, doc.id, 'trang.html', Buffer.from('<script>alert(1)</script>'))).status, 415);
    assert.equal((await upload(s, doc.id, 'gia.pdf', Buffer.from('MZ không phải pdf'))).status, 415);
    assert.equal((await upload(s, doc.id, 'rong.txt', Buffer.alloc(0))).status, 400);
    const dup = await upload(s, doc.id, 'ban-sao.pdf', PDF);
    assert.equal(dup.status, 201);
    assert.equal(dup.data.duplicates.length, 1, 'cảnh báo tệp trùng checksum, không tự xóa');
    assert.equal(fs.readdirSync(path.join(root, 'data/files/tmp')).length, 0, 'không còn tệp tạm');
    // tệp không truy cập trực tiếp qua đường dẫn tĩnh
    const direct = await fetch(`${s.base}/data/files/${files[0]}`);
    assert.notEqual(direct.headers.get('content-type'), 'application/pdf');
  });

  test('AC-06/FR-06: lịch tuần và tháng cùng dữ liệu; sự kiện cả ngày không lệch ngày; giờ VN đúng', async () => {
    const allDay = (await s.api('POST', '/api/events', { title: 'Hội giảng', all_day: true, start_date: '2026-10-10' })).data;
    assert.equal(allDay.start_date, '2026-10-10');
    assert.equal(allDay.end_date, '2026-10-11', 'end_date lưu exclusive');
    assert.equal(allDay.end_local.date, '2026-10-10');
    const late = (await s.api('POST', '/api/events', { title: 'Họp tối', start_date: '2026-10-12', start_time: '23:30' })).data;
    assert.equal(late.start_at, '2026-10-12T16:30:00.000Z', 'lưu instant UTC');
    assert.deepEqual(late.start_local, { date: '2026-10-12', time: '23:30' });
    const early = (await s.api('POST', '/api/events', { title: 'Trực sớm', start_date: '2026-10-12', start_time: '00:30' })).data;
    assert.equal(early.start_at, '2026-10-11T17:30:00.000Z');
    const week = (await s.api('GET', '/api/calendar?from=2026-10-12&to=2026-10-19')).data;
    const month = (await s.api('GET', '/api/calendar?from=2026-09-28&to=2026-11-09')).data;
    const prevWeek = (await s.api('GET', '/api/calendar?from=2026-10-05&to=2026-10-12')).data;
    assert.ok(week.events.some((e) => e.id === late.id) && week.events.some((e) => e.id === early.id));
    assert.ok(!prevWeek.events.some((e) => e.id === early.id), 'sự kiện 00:30 ngày 12 không rơi sang tuần trước');
    assert.ok(prevWeek.events.some((e) => e.id === allDay.id) && !week.events.some((e) => e.id === allDay.id));
    const pick = (cal, id) => JSON.stringify(cal.events.find((e) => e.id === id));
    assert.equal(pick(week, late.id), pick(month, late.id), 'tuần và tháng trả cùng bản ghi');
    // sửa ở tuần → tháng phản ánh
    await s.api('PUT', `/api/events/${late.id}`, { title: 'Họp tối (dời)', start_date: '2026-10-14', start_time: '19:00', end_time: '20:30' });
    const month2 = (await s.api('GET', '/api/calendar?from=2026-09-28&to=2026-11-09')).data;
    const moved = month2.events.find((e) => e.id === late.id);
    assert.equal(moved.title, 'Họp tối (dời)');
    assert.equal(moved.start_local.date, '2026-10-14');
    // nhiệm vụ có hạn hiện đúng ngày trong cả hai chế độ
    const t = (await s.api('POST', '/api/tasks', { title: 'Nộp đề', due_kind: 'date', due_date: '2026-10-16' })).data;
    const w3 = (await s.api('GET', '/api/calendar?from=2026-10-12&to=2026-10-19')).data;
    const m3 = (await s.api('GET', '/api/calendar?from=2026-09-28&to=2026-11-09')).data;
    assert.equal(w3.tasks.find((x) => x.id === t.id).due_local.date, '2026-10-16');
    assert.equal(m3.tasks.find((x) => x.id === t.id).due_local.date, '2026-10-16');
    // validation: kết thúc trước bắt đầu
    const bad = await s.api('POST', '/api/events', { title: 'Sai', all_day: true, start_date: '2026-10-10', end_date: '2026-10-09' });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.fields.end_date);
  });

  test('FR-05: nhiệm vụ – quá hạn tính theo ngày VN, hoàn tất, lọc; thay đổi phản ánh ở tổng quan', async () => {
    const today = todayVN();
    const y = (await s.api('POST', '/api/tasks', { title: 'Hôm qua', due_kind: 'date', due_date: addDays(today, -1), priority: 'thap' })).data;
    const t = (await s.api('POST', '/api/tasks', { title: 'Hôm nay', due_kind: 'date', due_date: today })).data;
    assert.equal(y.overdue, true);
    assert.equal(t.overdue, false, 'hạn cả ngày hôm nay chưa quá hạn');
    const both = await s.api('POST', '/api/tasks', { title: 'x', due_kind: 'datetime', due_date: today });
    assert.equal(both.status, 400);
    let ov = (await s.api('GET', '/api/overview')).data;
    assert.equal(ov.priorities[0].id, y.id, 'việc quá hạn lên đầu ưu tiên');
    assert.ok(ov.priorities.length <= 3);
    assert.ok((await s.api('GET', '/api/tasks?due=overdue')).data.items.some((x) => x.id === y.id));
    await s.api('POST', `/api/tasks/${y.id}/status`, { status: 'hoan_tat' });
    ov = (await s.api('GET', '/api/overview')).data;
    assert.ok(!ov.priorities.some((x) => x.id === y.id));
    const done = (await s.api('GET', `/api/tasks/${y.id}`)).data;
    assert.equal(done.status, 'hoan_tat');
    assert.ok(done.completed_at);
    const noTitle = await s.api('POST', '/api/tasks', { title: '  ' });
    assert.equal(noTitle.status, 400);
    assert.ok(noTitle.data.fields.title);
  });

  test('AC-07: email → nhiệm vụ; bấm lại không tạo trùng; hoàn tất việc không tự đổi email', async () => {
    const m = (await s.api('POST', '/api/emails', { subject: 'Nộp kế hoạch tổ', sender: 'Tổ trưởng', received_date: todayVN(), due_date: addDays(todayVN(), 3), source_url: 'https://mail.example/thread/1' })).data;
    const a = await s.api('POST', `/api/emails/${m.id}/create-task`, {});
    assert.equal(a.status, 201);
    assert.equal(a.data.created, true);
    assert.equal(a.data.task.due_date, m.due_date);
    const b = await s.api('POST', `/api/emails/${m.id}/create-task`, {});
    assert.equal(b.status, 200);
    assert.equal(b.data.created, false);
    assert.equal(b.data.task.id, a.data.task.id);
    assert.equal((await s.api('GET', `/api/emails/${m.id}`)).data.tasks.length, 1);
    const c = await s.api('POST', `/api/emails/${m.id}/create-task`, { force_new: true, title: 'Việc thứ hai chủ động' });
    assert.equal(c.data.created, true);
    assert.equal((await s.api('GET', `/api/emails/${m.id}`)).data.tasks.length, 2);
    await s.api('POST', `/api/tasks/${a.data.task.id}/status`, { status: 'hoan_tat' });
    assert.equal((await s.api('GET', `/api/emails/${m.id}`)).data.status, 'chua_xu_li');
    const task = (await s.api('GET', `/api/tasks/${a.data.task.id}`)).data;
    assert.equal(task.emails[0].id, m.id, 'mở nhiệm vụ thấy email nguồn');
  });

  test('AC-08: luận văn – một bản hiện hành; góp ý đúng bản; tiến độ từ đầu việc; thiếu năm không đếm ngược', async () => {
    const d = (await s.api('POST', '/api/documents', { category: 'thesis', title: 'Bản thảo luận văn', material_type: 'ban_thao' })).data;
    const v1 = d.current_version_id;
    const fb = (await s.api('POST', '/api/feedback', { project_id: 'prj_luan_van', document_version_id: v1, reviewer: 'PB1', content: 'Làm rõ chương 1' })).data;
    const r = await upload(s, d.id, 'ban-thao-v2.pdf', PDF, '?version_label=B%E1%BA%A3n%202');
    const v2 = r.data.document.current_version_id;
    assert.notEqual(v1, v2);
    const det = (await s.api('GET', `/api/documents/${d.id}`)).data;
    assert.equal(det.versions.filter((v) => v.is_current).length, 1, 'chỉ một bản hiện hành');
    const other = (await s.api('POST', '/api/documents', { category: 'thesis', title: 'Slide' })).data;
    const wrong = await s.api('POST', `/api/documents/${d.id}/current-version`, { version_id: other.current_version_id });
    assert.equal(wrong.status, 400, 'không đặt bản của tài liệu khác làm hiện hành');
    const p = (await s.api('GET', '/api/projects/prj_luan_van')).data;
    assert.equal(p.feedback.find((f) => f.id === fb.id).document_version_id, v1, 'góp ý vẫn gắn bản 1');
    await s.api('PUT', `/api/feedback/${fb.id}`, { content: 'Làm rõ chương 1', response_note: 'Đã bổ sung', status: 'da_giai_trinh', document_version_id: v2 });
    const p1 = (await s.api('GET', '/api/projects/prj_luan_van')).data;
    assert.equal(p1.feedback.find((f) => f.id === fb.id).document_version_id, v1, 'sửa góp ý không chuyển bản');
    const ft1 = await s.api('POST', `/api/feedback/${fb.id}/create-task`, {});
    const ft2 = await s.api('POST', `/api/feedback/${fb.id}/create-task`, {});
    assert.equal(ft1.data.task.id, ft2.data.task.id);
    assert.equal(p.progress.percent, null);
    const t1 = (await s.api('POST', '/api/tasks', { title: 'Slide', project_id: 'prj_luan_van', required_for_progress: true })).data;
    await s.api('POST', '/api/tasks', { title: 'Hồ sơ', project_id: 'prj_luan_van', required_for_progress: true });
    const t3 = (await s.api('POST', '/api/tasks', { title: 'Bỏ', project_id: 'prj_luan_van', required_for_progress: true })).data;
    await s.api('POST', `/api/tasks/${t1.id}/status`, { status: 'hoan_tat' });
    await s.api('POST', `/api/tasks/${t3.id}/status`, { status: 'huy' });
    const p2 = (await s.api('GET', '/api/projects/prj_luan_van')).data;
    assert.equal(p2.progress.total, 2);
    assert.equal(p2.progress.done, 1);
    assert.equal(p2.progress.percent, 50);
    assert.equal(p2.defense.countdown_days, null);
    const noYear = await s.api('PUT', '/api/projects/prj_luan_van', { name: 'Luận văn thạc sĩ', defense_day: 25, defense_month: 10, date_confirmed: true });
    assert.equal(noYear.status, 400, 'không xác nhận khi thiếu năm');
    const bad = await s.api('PUT', '/api/projects/prj_luan_van', { name: 'Luận văn thạc sĩ', defense_day: 31, defense_month: 2, defense_year: 2027 });
    assert.equal(bad.status, 400);
    const ok = await s.api('PUT', '/api/projects/prj_luan_van', { name: 'Luận văn thạc sĩ', defense_day: 25, defense_month: 10, defense_year: 2030, date_confirmed: true });
    assert.equal(ok.data.defense.countdown_days > 0, true);
    // trả về trạng thái chưa xác nhận như dữ liệu người dùng
    const back = await s.api('PUT', '/api/projects/prj_luan_van', { name: 'Luận văn thạc sĩ', defense_day: 25, defense_month: 10 });
    assert.equal(back.data.defense.countdown_days, null);
  });

  test('AC-14: lỗi lưu không sinh dữ liệu nửa vời', async () => {
    const n = (await s.api('GET', '/api/system/info')).data.counts;
    const r = await s.api('POST', '/api/documents', { category: 'lesson', title: 'Nửa vời', tags: ['a'], lesson: { periods: 999 } });
    assert.equal(r.status, 400);
    const r2 = await s.api('POST', '/api/documents', { category: 'official', title: 'Nửa vời', tags: ['b'], official: { issued_date: '2026-02-30' } });
    assert.equal(r2.status, 400);
    const r3 = await s.api('POST', '/api/documents', { category: 'material', title: 'x'.repeat(301) });
    assert.equal(r3.status, 400);
    const m = (await s.api('GET', '/api/system/info')).data.counts;
    for (const k of ['documents', 'tags', 'document_versions', 'lesson_plans', 'official_documents']) assert.equal(m[k], n[k], k);
  });

  test('AC-16: dữ liệu minh họa tách CSDL riêng, có nhãn, không đổi số liệu thật', async () => {
    const real = (await s.api('GET', '/api/system/info')).data.counts;
    await s.api('POST', '/api/system/mode', { mode: 'demo' });
    const demo = (await s.api('GET', '/api/documents')).data.items;
    assert.ok(demo.length > 0 && demo.every((d) => d.title.startsWith('[Minh họa]')));
    assert.ok(fs.existsSync(path.join(root, 'data/demo/db/demo.sqlite')));
    assert.equal((await s.api('POST', '/api/backups', {})).status, 409, 'không sao lưu khi đang minh họa');
    await s.api('POST', '/api/system/mode', { mode: 'real' });
    assert.deepEqual((await s.api('GET', '/api/system/info')).data.counts, real);
  });

  test('Đường dẫn thư mục: lưu đường dẫn ổ D, mở thư mục an toàn, máy chủ chỉ chạy một bản', async () => {
    const d = await s.api('POST', '/api/documents', { category: 'lesson', title: 'Giáo án có thư mục', source_url: 'D:/2026-2027/Giao an/Sinh 10/' });
    assert.equal(d.status, 201);
    assert.equal(d.data.source_url, 'D:\\2026-2027\\Giao an\\Sinh 10');
    assert.equal(d.data.school_year, null);
    const bad = await s.api('POST', '/api/documents', { category: 'lesson', title: 'x', source_url: 'file:///D:/a' });
    assert.equal(bad.status, 400);
    const nf = await s.api('POST', '/api/system/open-path', { path: 'D:\\khong-ton-tai\\thu-muc' });
    assert.equal(nf.status, 404);
    assert.equal((await s.api('POST', '/api/system/open-path', { path: 'https://evil.example' })).status, 400);
    const own = await s.api('POST', '/api/system/open-path', { target: 'data' });
    assert.equal(own.status, 200);
    const info = (await s.api('GET', '/api/system/info')).data;
    assert.equal(info.root_abs, root);
    // Khởi động lần hai trên cùng thư mục: nhận ra máy chủ đang chạy và thoát, không mở CSDL lần nữa
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(process.cwd(), 'app/server/src/index.mjs')], { env: { ...process.env, NMW_ROOT: root }, encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /đã chạy sẵn/);
  });

  test('AC-04: lưu bền vững sau khởi động lại máy chủ (bản ghi + tệp)', async () => {
    const before = (await s.api('GET', '/api/system/info')).data.counts;
    const docs = (await s.api('GET', '/api/documents?q=de%20thuc%20hanh')).data.items;
    assert.equal(docs.length, 1);
    await s.stop();
    s = await startServer(root);
    const after = (await s.api('GET', '/api/system/info')).data.counts;
    assert.deepEqual(after, before);
    const det = (await s.api('GET', `/api/documents/${docs[0].id}`)).data;
    const att = det.versions.flatMap((v) => v.attachments)[0];
    const buf = Buffer.from(await (await fetch(`${s.base}/api/attachments/${att.id}/download`)).arrayBuffer());
    assert.equal(sha(buf), att.sha256);
    assert.equal(sha(buf), sha(PDF));
  });

  test('AC-11/AC-12: sao lưu nhất quán, diễn tập khôi phục khớp; gói hỏng bị từ chối; khôi phục thật có rollback', async () => {
    const counts0 = (await s.api('GET', '/api/system/info')).data.counts;
    const b = await s.api('POST', '/api/backups', { label: 'kiem thu' });
    assert.equal(b.status, 201, JSON.stringify(b.data));
    const name = b.data.name;
    assert.equal(b.data.verify.ok, true);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'backups', name, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.counts, counts0, 'manifest đếm đúng số bản ghi');
    for (const f of manifest.files) assert.equal(sha(fs.readFileSync(path.join(root, 'backups', name, f.path))), f.sha256);
    const v = await s.api('POST', `/api/backups/${name}/verify`);
    assert.equal(v.data.ok, true);
    const drill = await s.api('POST', `/api/backups/${name}/restore-test`);
    assert.equal(drill.data.ok, true, JSON.stringify(drill.data.errors));
    assert.deepEqual(drill.data.counts, counts0);
    assert.equal(drill.data.files_checked, manifest.files.length);

    // Gói hỏng: sửa 1 byte tệp → sai checksum
    const bad1 = `${name.slice(0, 19)}_hong_checksum`;
    fs.cpSync(path.join(root, 'backups', name), path.join(root, 'backups', bad1), { recursive: true });
    const f0 = path.join(root, 'backups', bad1, manifest.files[0].path);
    const bytes = fs.readFileSync(f0);
    bytes[10] ^= 0xff;
    fs.writeFileSync(f0, bytes);
    // Gói thiếu tệp
    const bad2 = `${name.slice(0, 19)}_thieu_tep`;
    fs.cpSync(path.join(root, 'backups', name), path.join(root, 'backups', bad2), { recursive: true });
    fs.rmSync(path.join(root, 'backups', bad2, manifest.files[0].path));
    // Gói có đường dẫn thoát ra ngoài
    const bad3 = `${name.slice(0, 19)}_duong_dan`;
    fs.cpSync(path.join(root, 'backups', name), path.join(root, 'backups', bad3), { recursive: true });
    const m3 = JSON.parse(fs.readFileSync(path.join(root, 'backups', bad3, 'manifest.json'), 'utf8'));
    m3.files.push({ path: 'files/../../../evil.txt', bytes: 1, sha256: 'x' });
    fs.writeFileSync(path.join(root, 'backups', bad3, 'manifest.json'), JSON.stringify(m3));
    for (const bad of [bad1, bad2, bad3]) {
      const vv = await s.api('POST', `/api/backups/${bad}/verify`);
      assert.equal(vv.data.ok, false, bad);
      const rr = await s.api('POST', `/api/backups/${bad}/restore`, { confirm: `KHOI PHUC ${bad}` });
      assert.equal(rr.status, 422, bad);
    }
    assert.deepEqual((await s.api('GET', '/api/system/info')).data.counts, counts0, 'dữ liệu thật không đổi sau gói hỏng');

    // Khôi phục thật: thêm bản ghi sau sao lưu rồi khôi phục → bản ghi mới biến mất, dữ liệu khớp gói
    const extra = (await s.api('POST', '/api/tasks', { title: 'Việc thêm sau sao lưu' })).data;
    const wrongConfirm = await s.api('POST', `/api/backups/${name}/restore`, { confirm: 'khoi phuc' });
    assert.equal(wrongConfirm.status, 400);
    const rs = await s.api('POST', `/api/backups/${name}/restore`, { confirm: `KHOI PHUC ${name}` });
    assert.equal(rs.status, 200, JSON.stringify(rs.data));
    assert.ok(rs.data.pre_restore_backup);
    assert.ok(fs.existsSync(path.join(root, 'backups', rs.data.pre_restore_backup, 'manifest.json')), 'có bản sao trước khi khôi phục');
    assert.ok(fs.existsSync(path.join(root, rs.data.rollback_dir, 'db')), 'giữ dữ liệu cũ để rollback');
    assert.equal((await s.api('GET', `/api/tasks/${extra.id}`)).status, 404);
    assert.deepEqual((await s.api('GET', '/api/system/info')).data.counts, counts0);
    const docs = (await s.api('GET', '/api/documents?q=de%20thuc%20hanh')).data.items;
    const att = (await s.api('GET', `/api/documents/${docs[0].id}`)).data.versions.flatMap((x) => x.attachments)[0];
    const buf = Buffer.from(await (await fetch(`${s.base}/api/attachments/${att.id}/download`)).arrayBuffer());
    assert.equal(sha(buf), att.sha256, 'tệp sau khôi phục đúng SHA-256');
  });
});
