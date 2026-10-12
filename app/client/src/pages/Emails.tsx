// Email quan trọng: nhập tay, theo dõi trạng thái/hạn, tạo hoặc mở nhiệm vụ liên kết (không tạo trùng).
import { useState } from 'react';
import { post, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, fmtDate } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { SourceLink } from '../components/items';
import { Badge, Dialog, Empty, ErrorBox, Icon, Loading } from '../components/ui';
import { EmailForm } from '../features/forms';

export function EmailsPage({ focusId }: { focusId?: string }) {
  const { loc, navigate } = useRouter();
  const { refreshKey, openAdd, bump, toast } = useApp();
  const qs = new URLSearchParams();
  for (const k of ['status', 'q', 'archived']) if (loc.search.get(k)) qs.set(k, loc.search.get(k)!);
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/api/emails?${qs}`, refreshKey);
  const [edit, setEdit] = useState<any>(null);
  const setQ = (k: string, v: string | null) => {
    const s = new URLSearchParams(loc.search);
    if (v) s.set(k, v);
    else s.delete(k);
    navigate(`/email-quan-trong${s.toString() ? `?${s}` : ''}`, { replace: true });
  };
  const act = async (fn: () => Promise<any>, msg: string) => {
    try {
      const r = await fn();
      toast(msg);
      bump();
      return r;
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const createTask = async (m: any) => {
    const r = await act(() => post(`/api/emails/${m.id}/create-task`, {}), 'Đã xử lí yêu cầu tạo nhiệm vụ');
    if (r) {
      toast(r.created ? `Đã tạo nhiệm vụ “${r.task.title}”` : 'Email này đã có nhiệm vụ – mở nhiệm vụ hiện có, không tạo trùng');
      navigate(`/nhiem-vu/${r.task.id}`);
    }
  };
  const items = data?.items ?? [];
  return (
    <div className="page">
      <div className="page-head tone-violet">
        <div>
          <p className="eyebrow">Công việc &amp; luận văn</p>
          <h1>Email quan trọng</h1>
          <p className="muted">Nhập tay để theo dõi. Ứng dụng không kết nối hộp thư, không đọc và không gửi thư.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openAdd('email')}>
          <Icon name="plus" size={18} /> Thêm email
        </button>
      </div>
      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc email">
        <div className="filter filter-q">
          <label htmlFor="e-q">Tìm (tiêu đề, người gửi, ghi chú)</label>
          <input id="e-q" type="search" defaultValue={loc.search.get('q') ?? ''} onChange={(e) => setQ('q', e.target.value.trim() || null)} />
        </div>
        <div className="filter">
          <label htmlFor="e-st">Trạng thái</label>
          <select id="e-st" value={loc.search.get('status') ?? ''} onChange={(e) => setQ('status', e.target.value || null)}>
            <option value="">Tất cả</option>
            {Object.entries(L.emailStatus).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="filter filter-check">
          <input id="e-arch" type="checkbox" checked={loc.search.get('archived') === '1'} onChange={(e) => setQ('archived', e.target.checked ? '1' : null)} />
          <label htmlFor="e-arch">Đã lưu trữ</label>
        </div>
      </form>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !items.length && (
        <Empty action={<button type="button" className="btn btn-primary" onClick={() => openAdd('email')}>Thêm email đầu tiên</button>}>Chưa có email nào được theo dõi.</Empty>
      )}
      <ul className="doc-list">
        {items.map((m) => {
          const openTask = m.tasks.find((t: any) => !t.archived_at);
          return (
            <li key={m.id} id={`email-${m.id}`} className={`doc-card card${focusId === m.id ? ' is-focus' : ''}`}>
              <div className="doc-card-main">
                <strong className="doc-title">{m.subject}</strong>
                <span className="badges">
                  <Badge tone={m.status === 'hoan_tat' ? 'ok' : m.status === 'cho_phan_hoi' ? 'warn' : 'violet'}>{L.emailStatus[m.status]}</Badge>
                  {m.due_date && <Badge tone={m.status !== 'hoan_tat' && m.due_date < new Date().toISOString().slice(0, 10) ? 'danger' : 'neutral'}>Hạn {fmtDate(m.due_date)}</Badge>}
                  {m.archived_at && <Badge>Đã lưu trữ</Badge>}
                </span>
                <p className="muted small">
                  {[m.sender && `Từ: ${m.sender}`, m.received_date && `Nhận ${fmtDate(m.received_date)}`].filter(Boolean).join(' · ')}
                </p>
                {m.note && <p className="pre small">{m.note}</p>}
                <p className="small">
                  {m.source_url && <SourceLink value={m.source_url} webLabel="Mở thư gốc" />}
                  {m.tasks.length > 0 && (
                    <>
                      {m.source_url && ' · '}
                      Nhiệm vụ:{' '}
                      {m.tasks.map((t: any, i: number) => (
                        <span key={t.id}>
                          {i > 0 && ', '}
                          <Link to={`/nhiem-vu/${t.id}`}>{t.title}</Link> ({L.taskStatus[t.status]})
                        </span>
                      ))}
                    </>
                  )}
                </p>
                {openTask && openTask.status === 'hoan_tat' && m.status !== 'hoan_tat' && (
                  <p className="muted small">Nhiệm vụ đã hoàn tất – trạng thái email không tự đổi; cập nhật nếu đã trả lời.</p>
                )}
              </div>
              <div className="doc-card-actions">
                <button type="button" className="btn btn-small" onClick={() => createTask(m)}>
                  {openTask ? 'Mở nhiệm vụ' : 'Tạo nhiệm vụ'}
                </button>
                <button type="button" className="btn btn-small" onClick={() => setEdit(m)}>
                  Sửa
                </button>
                {m.archived_at ? (
                  <button type="button" className="btn btn-small" onClick={() => act(() => post(`/api/emails/${m.id}/restore`), 'Đã khôi phục')}>
                    Khôi phục
                  </button>
                ) : (
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => act(() => post(`/api/emails/${m.id}/archive`), 'Đã lưu trữ')}>
                    Lưu trữ
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {edit && (
        <Dialog title="Sửa email" onClose={() => setEdit(null)} wide>
          <EmailForm
            email={edit}
            onCancel={() => setEdit(null)}
            onDone={() => {
              setEdit(null);
              toast('Đã lưu');
              bump();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
