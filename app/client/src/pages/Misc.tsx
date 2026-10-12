// Chi tiết nhiệm vụ, tìm kiếm chung, quản lí dữ liệu (sao lưu/khôi phục, minh họa, lưu trữ), hướng dẫn.
import { useState } from 'react';
import { del, post, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, fmtDate, fmtDue, fmtInstant } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { DocBadges, PriorityBadge, SourceLink, TaskList, TaskStatusBadge } from '../components/items';
import { Badge, Dialog, Empty, ErrorBox, Loading } from '../components/ui';
import { TaskForm } from '../features/forms';

export function TaskDetail({ id }: { id: string }) {
  const { refreshKey, bump, toast, openAdd } = useApp();
  const { data: t, error, loading, reload } = useApi<any>(`/api/tasks/${id}`, refreshKey);
  const [editing, setEditing] = useState(false);
  const act = async (fn: () => Promise<any>, msg: string) => {
    try {
      await fn();
      toast(msg);
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  if (loading && !t) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!t) return null;
  return (
    <div className="page">
      <nav className="crumbs" aria-label="Đường dẫn">
        <Link to="/">Tổng quan</Link> / <Link to="/lich-cong-viec#nhiem-vu">Lịch &amp; nhiệm vụ</Link> / <span aria-current="page">{t.title}</span>
      </nav>
      <div className="page-head tone-violet">
        <div>
          <p className="eyebrow">Nhiệm vụ</p>
          <h1>{t.title}</h1>
          <span className="badges">
            <TaskStatusBadge t={t} /> <PriorityBadge p={t.priority} />
            {t.archived_at && <Badge>Đã lưu trữ</Badge>}
          </span>
        </div>
        <div className="head-actions">
          {t.status !== 'hoan_tat' ? (
            <button type="button" className="btn btn-primary" onClick={() => act(() => post(`/api/tasks/${t.id}/status`, { status: 'hoan_tat' }), 'Đã hoàn tất')}>
              Hoàn tất
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => act(() => post(`/api/tasks/${t.id}/status`, { status: 'dang_lam' }), 'Đã mở lại')}>
              Mở lại
            </button>
          )}
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Sửa
          </button>
          {t.archived_at ? (
            <button type="button" className="btn" onClick={() => act(() => post(`/api/tasks/${t.id}/restore`), 'Đã khôi phục')}>
              Khôi phục
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => act(() => post(`/api/tasks/${t.id}/archive`), 'Đã lưu trữ')}>
              Lưu trữ
            </button>
          )}
        </div>
      </div>
      <div className="detail-grid">
        <section className="card">
          <h2 className="card-title">Thông tin</h2>
          <dl className="dl">
            <dt>Hạn</dt>
            <dd>{fmtDue(t)}{t.due_at && <span className="muted small"> (giờ Việt Nam)</span>}</dd>
            <dt>Trạng thái</dt>
            <dd>{L.taskStatus[t.status]}{t.completed_at && ` · hoàn tất ${fmtInstant(t.completed_at)}`}</dd>
            {t.project && (
              <>
                <dt>Dự án</dt>
                <dd>
                  <Link to="/luan-van">{t.project.name}</Link> {t.phase && `· ${L.phase[t.phase]}`} {t.required_for_progress && <Badge tone="violet">Tính tiến độ</Badge>}
                </dd>
              </>
            )}
            {t.notes && (<><dt>Ghi chú</dt><dd className="pre">{t.notes}</dd></>)}
            <dt>Tạo lúc</dt>
            <dd>{fmtInstant(t.created_at)}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 className="card-title">Liên kết nguồn</h2>
          <h3 className="sub">Tài liệu</h3>
          {t.documents.length ? (
            <ul className="plain">
              {t.documents.map((d: any) => (
                <li key={d.id}>
                  <Link to={`/tai-lieu/${d.id}`}>{d.title}</Link> <span className="muted small">({L.category[d.category]})</span>{' '}
                  <button type="button" className="link-btn small" onClick={() => act(() => del(`/api/tasks/${t.id}/documents/${d.id}`), 'Đã bỏ liên kết')}>
                    Bỏ liên kết
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Chưa liên kết tài liệu (liên kết từ trang chi tiết tài liệu).</p>
          )}
          <h3 className="sub">Email</h3>
          {t.emails.length ? (
            <ul className="plain">
              {t.emails.map((m: any) => (
                <li key={m.id}>
                  <Link to={`/email-quan-trong/${m.id}`}>{m.subject}</Link> <Badge>{L.emailStatus[m.status]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Không tạo từ email.</p>
          )}
          <h3 className="sub">Lịch</h3>
          {t.events.length ? (
            <ul className="plain">
              {t.events.map((e: any) => (
                <li key={e.id}>{e.all_day ? fmtDate(e.start_date) : fmtInstant(e.start_at)} · {e.title}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Chưa có sự kiện gắn với việc này.</p>
          )}
          <button type="button" className="btn btn-small" onClick={() => openAdd('event', { linked_task_id: t.id, title: t.title, start_date: t.due_local?.date })}>
            + Đặt lịch làm việc này
          </button>
        </section>
      </div>
      {editing && (
        <Dialog title="Sửa nhiệm vụ" onClose={() => setEditing(false)} wide>
          <TaskForm
            task={t}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              toast('Đã lưu nhiệm vụ');
              bump();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

export function SearchPage() {
  const { loc } = useRouter();
  const q = loc.search.get('q') ?? '';
  const { refreshKey } = useApp();
  const { data, error, loading, reload } = useApi<any>(q ? `/api/search?q=${encodeURIComponent(q)}` : null, refreshKey);
  const total = data ? data.documents.length + data.tasks.length + data.emails.length + data.events.length : 0;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Kết quả tìm kiếm</h1>
          <p className="muted">
            {q ? <>Từ khóa “{q}” – tìm theo tên, số kí hiệu, mô tả, nhãn; gõ không dấu cũng được. Chưa tìm trong nội dung tệp.</> : 'Nhập từ khóa ở ô tìm kiếm trên đầu trang.'}
          </p>
        </div>
      </div>
      {loading && q && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && total === 0 && <Empty>Không tìm thấy kết quả nào.</Empty>}
      {data && total > 0 && (
        <div className="detail-grid">
          {data.documents.length > 0 && (
            <section className="card">
              <h2 className="card-title">Tài liệu ({data.documents.length})</h2>
              <ul className="plain doc-rows">
                {data.documents.map((d: any) => (
                  <li key={d.id}>
                    <Link to={`/tai-lieu/${d.id}`}>{d.title}</Link> <Badge tone="teal">{L.category[d.category]}</Badge> <DocBadges d={d} />
                    {d.tags.length > 0 && <div className="small muted">{d.tags.map((t: any) => `#${t.label}`).join(' ')}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.tasks.length > 0 && (
            <section className="card">
              <h2 className="card-title">Nhiệm vụ ({data.tasks.length})</h2>
              <TaskList items={data.tasks} empty="" compact />
            </section>
          )}
          {data.emails.length > 0 && (
            <section className="card">
              <h2 className="card-title">Email ({data.emails.length})</h2>
              <ul className="plain">
                {data.emails.map((m: any) => (
                  <li key={m.id}>
                    <Link to={`/email-quan-trong/${m.id}`}>{m.subject}</Link> <Badge>{L.emailStatus[m.status]}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.events.length > 0 && (
            <section className="card">
              <h2 className="card-title">Sự kiện ({data.events.length})</h2>
              <ul className="plain">
                {data.events.map((e: any) => (
                  <li key={e.id}>
                    <Link to={`/lich-cong-viec?d=${e.start_local.date}`}>{e.title}</Link> <span className="muted small">{e.all_day ? fmtDate(e.start_date) : fmtInstant(e.start_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BackupPanel() {
  const { refreshKey, bump, toast, mode } = useApp();
  const { data, error, reload } = useApi<any>('/api/backups', refreshKey);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [restoreName, setRestoreName] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      const r = await fn();
      setReport({ title: label, ...r });
      bump();
      return r;
    } catch (e) {
      setReport({ title: label, ok: false, errors: [(e as Error).message] });
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="card" aria-labelledby="bk-title">
      <h2 id="bk-title" className="card-title">
        Sao lưu &amp; khôi phục
      </h2>
      <p className="muted small">
        Gói sao lưu nằm trong thư mục <code>backups/</code> của dự án (CSDL snapshot + tệp + manifest có SHA-256). Sao lưu cùng ổ chỉ chống lỗi thao tác: hãy định kỳ chép thư mục gói sang ổ/thiết bị khác.
      </p>
      {mode === 'demo' && <p className="form-warn">Đang ở chế độ minh họa – thoát về dữ liệu thật để sao lưu/khôi phục.</p>}
      <button type="button" className="btn btn-primary" disabled={!!busy || mode === 'demo'} aria-busy={busy === 'Tạo bản sao lưu'} onClick={() => run('Tạo bản sao lưu', () => post('/api/backups', {}))}>
        {busy === 'Tạo bản sao lưu' ? 'Đang sao lưu…' : 'Tạo bản sao lưu ngay'}
      </button>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !data.items.length && <p className="muted">Chưa có bản sao lưu nào.</p>}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Danh sách gói sao lưu</caption>
            <thead>
              <tr>
                <th scope="col">Gói</th>
                <th scope="col">Thời điểm (giờ VN)</th>
                <th scope="col">Bản ghi</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b: any) => (
                <tr key={b.name}>
                  <td>
                    <code>{b.name}</code>
                    {b.error && <Badge tone="danger">{b.error}</Badge>}
                  </td>
                  <td>{b.created_at_local ?? '—'}</td>
                  <td className="small">
                    {b.counts ? `${b.counts.documents} tài liệu · ${b.counts.tasks} việc · ${b.counts.emails} email · ${b.file_count} tệp` : '—'}
                    {b.missing_files > 0 && <Badge tone="warn">thiếu {b.missing_files} tệp</Badge>}
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-small" disabled={!!busy} onClick={() => run(`Kiểm tra ${b.name}`, () => post(`/api/backups/${b.name}/verify`))}>
                      Kiểm tra
                    </button>
                    <button type="button" className="btn btn-small" disabled={!!busy} onClick={() => run(`Diễn tập khôi phục ${b.name}`, () => post(`/api/backups/${b.name}/restore-test`))}>
                      Diễn tập
                    </button>
                    <button type="button" className="btn btn-small btn-ghost" disabled={!!busy || mode === 'demo'} onClick={() => { setRestoreName(b.name); setConfirm(''); }}>
                      Khôi phục…
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {busy && (
        <p role="status" className="muted">
          Đang {busy.toLowerCase()}…
        </p>
      )}
      {report && (
        <div className={`report ${report.ok === false ? 'report-bad' : 'report-ok'}`} role="status">
          <strong>{report.title}: {report.ok === false ? 'KHÔNG ĐẠT' : 'ĐẠT'}</strong>
          {report.name && <p>Đã tạo gói: <code>{report.name}</code> ({report.files} tệp)</p>}
          {report.target && <p>Vùng diễn tập: <code>{report.target}</code> · đã đối chiếu {report.files_checked} tệp (SHA-256) và số bản ghi.</p>}
          {report.pre_restore_backup && <p>Đã khôi phục. Bản sao trước khi khôi phục: <code>{report.pre_restore_backup}</code>; dữ liệu cũ giữ tại <code>{report.rollback_dir}</code>.</p>}
          {report.counts && <p className="small">Số bản ghi: {Object.entries(report.counts).filter(([k]) => ['documents', 'tasks', 'emails', 'events', 'attachments', 'feedback'].includes(k)).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>}
          {report.errors?.length > 0 && (
            <ul>
              {report.errors.map((e: string) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {report.warnings?.length > 0 && <p className="small">Cảnh báo: {report.warnings.join('; ')}</p>}
        </div>
      )}
      {restoreName && (
        <Dialog title="Khôi phục vào dữ liệu thật" onClose={() => setRestoreName(null)}>
          <p>
            Nguồn: <code>backups/{restoreName}</code>
            <br />
            Đích: dữ liệu đang dùng (<code>data/db</code>, <code>data/files</code>).
          </p>
          <p className="form-warn">
            Toàn bộ dữ liệu hiện tại sẽ được thay bằng nội dung gói. Trước khi thay, ứng dụng tự tạo bản sao lưu hiện trạng và giữ dữ liệu cũ trong <code>data/_rollback</code>. Gói lỗi sẽ bị từ chối trước khi đụng vào dữ liệu.
          </p>
          <div className="field">
            <label htmlFor="rs-confirm">
              Gõ chính xác: <code>KHOI PHUC {restoreName}</code>
            </label>
            <input id="rs-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setRestoreName(null)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={confirm !== `KHOI PHUC ${restoreName}` || !!busy}
              onClick={async () => {
                const n = restoreName;
                setRestoreName(null);
                await run(`Khôi phục ${n}`, () => post(`/api/backups/${n}/restore`, { confirm }));
              }}
            >
              Khôi phục
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function ArchivePanel() {
  const { refreshKey, bump, toast } = useApp();
  const { data, error, reload } = useApi<any>('/api/archive', refreshKey);
  const restore = async (path: string) => {
    try {
      await post(path);
      toast('Đã khôi phục khỏi lưu trữ');
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const rows: [string, string, string, string][] = data
    ? [
        ...data.documents.map((d: any) => ['Tài liệu', d.title, d.archived_at, `/api/documents/${d.id}/restore`]),
        ...data.tasks.map((t: any) => ['Nhiệm vụ', t.title, t.archived_at, `/api/tasks/${t.id}/restore`]),
        ...data.emails.map((m: any) => ['Email', m.subject, m.archived_at, `/api/emails/${m.id}/restore`]),
        ...data.events.map((e: any) => ['Sự kiện', e.title, e.archived_at, `/api/events/${e.id}/restore`]),
        ...data.feedback.map((f: any) => ['Góp ý', f.content, f.archived_at, `/api/feedback/${f.id}/restore`]),
      ]
    : [];
  return (
    <section className="card" id="luu-tru" aria-labelledby="ar-title">
      <h2 id="ar-title" className="card-title">
        Mục đã lưu trữ
      </h2>
      <p className="muted small">Lưu trữ chỉ ẩn khỏi danh sách; V1 không có xóa vĩnh viễn.</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !rows.length && <p className="muted">Không có mục nào trong lưu trữ.</p>}
      {rows.length > 0 && (
        <ul className="plain">
          {rows.map(([k, title, at, path]) => (
            <li key={path}>
              <Badge>{k}</Badge> {title} <span className="muted small">· lưu trữ {fmtInstant(at)}</span>{' '}
              <button type="button" className="btn btn-small" onClick={() => restore(path)}>
                Khôi phục
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PathRow({ target, path }: { target: string; path: string }) {
  const { toast } = useApp();
  const open = async () => {
    try {
      const r = await post('/api/system/open-path', { target });
      toast(r.ok ? 'Đã mở thư mục trong File Explorer' : r.message);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <span className="source-path">
      <code>{path}</code>
      <span className="row-actions">
        <button type="button" className="btn btn-small" onClick={open}>
          Mở thư mục
        </button>
      </span>
    </span>
  );
}

function AutostartPanel() {
  const { toast } = useApp();
  const { data, reload } = useApi<any>('/api/system/autostart');
  const [busy, setBusy] = useState(false);
  const toggle = async (enable: boolean) => {
    setBusy(true);
    try {
      const r = await post('/api/system/autostart', { enable });
      toast(enable ? 'Đã bật: máy chủ tự chạy khi đăng nhập Windows, có lối tắt trên màn hình nền' : 'Đã tắt tự chạy cùng Windows');
      void r;
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card" aria-labelledby="as-title">
      <h2 id="as-title" className="card-title">
        Mở nhanh lần sau (không cần bấm KHOI_DONG.bat)
      </h2>
      <p className="muted small">
        Khi bật: mỗi lần đăng nhập Windows, máy chủ tự chạy ẩn (không có cửa sổ đen); trên màn hình nền có lối tắt “Khong gian lam viec Be Hai”. Chỉ cần mở lối tắt hoặc dấu trang{' '}
        <code>http://127.0.0.1:5178/</code>. Hãy lưu địa chỉ này vào thanh dấu trang (Ctrl + D).
      </p>
      {data?.supported === false && <p className="form-warn">{data.message} Trên Windows có thể chạy tệp <code>CAI_TU_KHOI_DONG.bat</code> trong thư mục dự án.</p>}
      {data?.supported && (
        <p>
          Trạng thái: {data.tu_khoi_dong ? <Badge tone="ok">Đang bật tự chạy cùng Windows</Badge> : <Badge>Chưa bật</Badge>}{' '}
          {data.loi_tat && <Badge tone="teal">Có lối tắt trên màn hình nền</Badge>}
        </p>
      )}
      {data?.supported && (
        <div className="row-actions">
          {data.tu_khoi_dong ? (
            <button type="button" className="btn" disabled={busy} onClick={() => toggle(false)}>
              Tắt tự chạy cùng Windows
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} aria-busy={busy} onClick={() => toggle(true)}>
              {busy ? 'Đang thiết lập…' : 'Bật tự chạy cùng Windows + tạo lối tắt'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function SettingsPage() {
  const { refreshKey, mode, setMode, toast } = useApp();
  const { data: info } = useApi<any>('/api/system/info', refreshKey);
  const [switching, setSwitching] = useState(false);
  const switchMode = async (m: 'real' | 'demo') => {
    setSwitching(true);
    try {
      await post('/api/system/mode', { mode: m });
      setMode(m);
      toast(m === 'demo' ? 'Đã chuyển sang dữ liệu MINH HỌA (tách riêng)' : 'Đã quay về dữ liệu thật');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSwitching(false);
    }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Cài đặt</p>
          <h1>Quản lí dữ liệu</h1>
          <p className="muted">Ứng dụng chạy cục bộ tại {info?.listen ?? '127.0.0.1'}; dữ liệu nằm trong thư mục dự án trên máy này.</p>
        </div>
      </div>
      <div className="detail-grid">
        <section className="card" aria-labelledby="inf-title">
          <h2 id="inf-title" className="card-title">
            Nơi lưu dữ liệu
          </h2>
          {info ? (
            <dl className="dl">
              <dt>Chế độ</dt>
              <dd>{info.mode === 'demo' ? <Badge tone="demo">Dữ liệu minh họa</Badge> : <Badge tone="ok">Dữ liệu thật</Badge>}</dd>
              <dt>Thư mục dự án</dt>
              <dd><PathRow target="root" path={info.root_abs} /></dd>
              <dt>Dữ liệu (CSDL + tệp)</dt>
              <dd><PathRow target="data" path={info.data_abs} /></dd>
              <dt>Sao lưu</dt>
              <dd><PathRow target="backups" path={info.backups_abs} /></dd>
              <dt>Phiên bản</dt>
              <dd>Ứng dụng {info.version} · schema {info.schema_version} · Node {info.node}</dd>
              <dt>Hôm nay</dt>
              <dd>{fmtDate(info.today)} ({info.timezone})</dd>
            </dl>
          ) : (
            <Loading />
          )}
        </section>
        <section className="card" aria-labelledby="demo-title">
          <h2 id="demo-title" className="card-title">
            Dữ liệu minh họa
          </h2>
          <p className="muted small">
            Chỉ bật khi muốn xem thử. Dữ liệu minh họa lưu ở <code>data/demo</code>, có nhãn [Minh họa] và không lẫn vào số liệu thật. Khởi động lại máy chủ luôn về dữ liệu thật.
          </p>
          {mode === 'demo' ? (
            <button type="button" className="btn btn-primary" disabled={switching} onClick={() => switchMode('real')}>
              Thoát minh họa – về dữ liệu thật
            </button>
          ) : (
            <button type="button" className="btn" disabled={switching} onClick={() => switchMode('demo')}>
              Xem dữ liệu minh họa
            </button>
          )}
        </section>
      </div>
      <AutostartPanel />
      <BackupPanel />
      <ArchivePanel />
    </div>
  );
}

export function GuidePage() {
  return (
    <div className="page prose">
      <h1>Hướng dẫn nhanh</h1>
      <p>Bản đầy đủ: tệp <code>docs/HUONG_DAN_SU_DUNG.md</code> trong thư mục dự án.</p>
      <h2>Mở và tắt</h2>
      <ul>
        <li>Mở: nháy đúp <code>KHOI_DONG.bat</code> trong thư mục dự án trên ổ D. Máy chủ chạy trong một cửa sổ thu nhỏ trên thanh tác vụ và trình duyệt mở <code>http://127.0.0.1:5178/</code>.</li>
        <li><strong>Không đóng cửa sổ máy chủ</strong> khi đang dùng – đóng nó là tắt máy chủ, trang sẽ báo “Không kết nối được máy chủ cục bộ”. Khi đó chỉ cần nháy đúp lại <code>KHOI_DONG.bat</code>; trang tự kết nối lại.</li>
        <li>Tắt: nháy đúp <code>DUNG.bat</code> (hoặc Ctrl + C trong cửa sổ máy chủ). Đóng trình duyệt không làm mất dữ liệu.</li>
      </ul>
      <h2>Đường dẫn thư mục</h2>
      <p>Ô “Đường dẫn thư mục/tệp” nhận đường dẫn trên máy, ví dụ <code>D:\2026-2027\Giao an\Sinh 10</code> (sao chép từ thanh địa chỉ File Explorer). Trong trang chi tiết, bấm “Mở thư mục” để mở đúng thư mục đó; với đường dẫn tệp, File Explorer mở thư mục chứa và chọn sẵn tệp (không tự chạy tệp). Vẫn có thể dán link web nếu cần.</p>
      <h2>Thêm dữ liệu</h2>
      <ul>
        <li>Nút <strong>Thêm mới</strong> trên đầu trang: kế hoạch bài dạy, tài liệu chuyên môn, văn bản, nhiệm vụ, sự kiện, email, tài liệu luận văn.</li>
        <li>Tải tệp bản gốc: mở chi tiết tài liệu → “Phiên bản &amp; tệp bản gốc”. Bản mới nên thêm thành phiên bản của cùng tài liệu, không tạo bản ghi trùng.</li>
        <li>Một tài liệu có thể có nhiều nhãn và được tìm thấy từ nhiều nơi nhưng chỉ có một bản lưu chính.</li>
      </ul>
      <h2>Lịch &amp; nhiệm vụ</h2>
      <ul>
        <li>Tuần bắt đầu thứ Hai, giờ Việt Nam. Chế độ tuần và tháng dùng cùng dữ liệu.</li>
        <li>Việc “cả ngày” chỉ quá hạn khi đã sang ngày hôm sau.</li>
      </ul>
      <h2>Email</h2>
      <p>Nhập tay tiêu đề, người gửi, hạn, link thư gốc. “Tạo nhiệm vụ” bấm lại sẽ mở nhiệm vụ đã có, không tạo trùng. Hoàn tất nhiệm vụ không tự đánh dấu đã trả lời email.</p>
      <h2>Luận văn</h2>
      <p>Ngày bảo vệ hiện mới có 25/10. Khi biết năm chính thức, vào Hồ sơ luận văn → “Cập nhật mốc bảo vệ”, nhập năm và đánh dấu đã xác nhận để bật đếm ngược.</p>
      <h2>Sao lưu</h2>
      <p>
        Vào <Link to="/cai-dat">Quản lí dữ liệu</Link> → “Tạo bản sao lưu ngay”, rồi “Kiểm tra” và “Diễn tập”. Định kỳ chép thư mục gói trong <code>backups/</code> sang ổ khác.
      </p>
      <h2>Giới hạn V1</h2>
      <ul>
        <li>Chỉ dùng trên máy này qua localhost; không đồng bộ điện thoại, không thông báo khi ứng dụng đóng.</li>
        <li>Không kết nối Gmail/Outlook, không AI, không tìm trong nội dung PDF/Word.</li>
        <li>Chạy cục bộ không ngăn được người khác đang dùng chính tài khoản Windows này.</li>
      </ul>
    </div>
  );
}

export function EmailRedirect({ id }: { id: string }) {
  const { data, error } = useApi<any>(`/api/emails/${id}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="page">
      <nav className="crumbs" aria-label="Đường dẫn">
        <Link to="/">Tổng quan</Link> / <Link to="/email-quan-trong">Email quan trọng</Link> / <span aria-current="page">{data.subject}</span>
      </nav>
      <div className="page-head tone-violet">
        <div>
          <p className="eyebrow">Email quan trọng</p>
          <h1>{data.subject}</h1>
          <Badge tone="violet">{L.emailStatus[data.status]}</Badge>
        </div>
      </div>
      <section className="card">
        <dl className="dl">
          <dt>Người gửi</dt><dd>{data.sender || '—'}</dd>
          <dt>Ngày nhận</dt><dd>{fmtDate(data.received_date) || '—'}</dd>
          <dt>Hạn</dt><dd>{fmtDate(data.due_date) || '—'}</dd>
          <dt>Ghi chú</dt><dd className="pre">{data.note || '—'}</dd>
          <dt>Thư gốc / thư mục</dt><dd><SourceLink value={data.source_url} webLabel="Mở thư gốc" /></dd>
        </dl>
        <h2 className="sub">Nhiệm vụ liên kết</h2>
        <TaskList items={data.tasks.map((t: any) => ({ ...t, due_local: t.due_date ? { date: t.due_date, time: null } : null }))} empty="Chưa có nhiệm vụ." compact />
        <p>
          <Link to="/email-quan-trong">← Về danh sách email</Link>
        </p>
      </section>
    </div>
  );
}

export function NotFound() {
  return (
    <Empty action={<Link to="/">Về trang tổng quan</Link>}>Không tìm thấy trang này.</Empty>
  );
}
