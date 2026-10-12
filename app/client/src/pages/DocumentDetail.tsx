// Chi tiết tài liệu: thông tin, phiên bản & tệp (một bản hiện hành), nhãn, liên kết tài liệu/nhiệm vụ/lịch.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { del, post, uploadFile, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { CATEGORY_PATH, L, fmtBytes, fmtDate, fmtInstant } from '../lib/format';
import { Link } from '../lib/router';
import { DocBadges, SourceLink, TaskList } from '../components/items';
import { Badge, Dialog, ErrorBox, FormError, Loading } from '../components/ui';
import { DocumentForm } from '../features/forms';

function Uploader({ doc, onDone }: { doc: any; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'new' | 'current'>('new');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useApp();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setErr('Chưa chọn tệp');
    setBusy(true);
    setErr(null);
    setWarn(null);
    try {
      const r = await uploadFile(doc.id, file, mode === 'current' ? { versionId: doc.current_version_id } : { versionLabel: label || undefined });
      const dups = (r.duplicates ?? []).filter((d: any) => true && d);
      if (dups.length) setWarn(`Cảnh báo: tệp giống hệt (cùng SHA-256) đã có ở: ${dups.map((d: any) => `“${d.title}”`).join(', ')}. Không tự xóa bản nào.`);
      toast(`Đã tải lên ${r.attachment.original_name} (${fmtBytes(r.attachment.bytes)})`);
      setFile(null);
      setLabel('');
      if (inputRef.current) inputRef.current.value = '';
      onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="uploader" onSubmit={submit}>
      <FormError message={err} />
      {warn && (
        <p className="form-warn" role="status">
          {warn}
        </p>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="up-file">Chọn tệp bản gốc (tối đa 50 MB)</label>
          <input id="up-file" ref={inputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.md,.rtf,.jpg,.jpeg,.png,.gif,.webp,.mp3,.mp4,.zip" />
        </div>
        <div className="field">
          <label htmlFor="up-mode">Gắn vào</label>
          <select id="up-mode" value={mode} onChange={(e) => setMode(e.target.value as 'new' | 'current')}>
            <option value="new">Phiên bản mới (đặt làm bản hiện hành)</option>
            <option value="current">Bản hiện hành ({doc.current_version_label ?? '—'})</option>
          </select>
        </div>
        {mode === 'new' && (
          <div className="field">
            <label htmlFor="up-label">Tên phiên bản</label>
            <input id="up-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Bản ${doc.versions.length + 1}`} maxLength={60} />
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy || !file} aria-busy={busy}>
        {busy ? 'Đang tải lên…' : 'Tải lên'}
      </button>
    </form>
  );
}

function RelatedPicker({ doc, onDone }: { doc: any; onDone: () => void }) {
  const [q, setQ] = useState('');
  const { data } = useApi<{ items: any[] }>(q.trim().length >= 2 ? `/api/documents?q=${encodeURIComponent(q)}&limit=8` : null);
  const { toast } = useApp();
  const add = async (id: string) => {
    try {
      await post(`/api/documents/${doc.id}/relations`, { related_document_id: id });
      setQ('');
      onDone();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div className="picker">
      <label htmlFor="rel-q">Liên kết thêm tài liệu (gõ ít nhất 2 kí tự)</label>
      <input id="rel-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && data && (
        <ul className="picker-list">
          {data.items.filter((d) => d.id !== doc.id).map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => add(d.id)}>
                {d.title} <span className="muted small">({L.category[d.category]})</span>
              </button>
            </li>
          ))}
          {!data.items.length && <li className="muted small">Không tìm thấy</li>}
        </ul>
      )}
    </div>
  );
}

export function DocumentDetail({ id }: { id: string }) {
  const { refreshKey, bump, toast, openAdd } = useApp();
  const { data: d, error, loading, reload } = useApi<any>(`/api/documents/${id}`, refreshKey);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    post(`/api/documents/${id}/opened`).catch(() => {});
  }, [id]);
  const act = async (fn: () => Promise<any>, msg: string) => {
    try {
      await fn();
      toast(msg);
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  if (loading && !d) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return null;
  const back = CATEGORY_PATH[d.category];
  return (
    <div className="page">
      <nav className="crumbs" aria-label="Đường dẫn">
        <Link to="/">Tổng quan</Link> / <Link to={back}>{L.category[d.category]}</Link> / <span aria-current="page">{d.title}</span>
      </nav>
      <div className={`page-head ${d.category === 'thesis' ? 'tone-violet' : 'tone-teal'}`}>
        <div>
          <p className="eyebrow">{L.category[d.category]}</p>
          <h1>{d.title}</h1>
          <DocBadges d={d} />
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Sửa
          </button>
          {!d.archived_at && (
            <button type="button" className="btn" aria-pressed={d.pinned} onClick={() => act(() => post(`/api/documents/${d.id}/pin`, { pinned: !d.pinned }), d.pinned ? 'Đã bỏ ghim' : 'Đã ghim')}>
              {d.pinned ? 'Bỏ ghim' : 'Ghim'}
            </button>
          )}
          {d.archived_at ? (
            <button type="button" className="btn" onClick={() => act(() => post(`/api/documents/${d.id}/restore`), 'Đã khôi phục')}>
              Khôi phục
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => act(() => post(`/api/documents/${d.id}/archive`), 'Đã lưu trữ (có thể khôi phục)')}>
              Lưu trữ
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <section className="card" aria-labelledby="sec-info">
          <h2 id="sec-info" className="card-title">
            Thông tin
          </h2>
          <dl className="dl">
            {d.subject && (<><dt>Môn</dt><dd>{d.subject}{d.tech_branch ? ` – ${L.tech[d.tech_branch]}` : ''}</dd></>)}
            {d.grade && (<><dt>Khối</dt><dd>{d.grade}</dd></>)}
            {d.school_year && (<><dt>Năm học</dt><dd>{d.school_year}</dd></>)}
            {d.lesson && (
              <>
                <dt>Học kì / Lớp</dt>
                <dd>{[d.lesson.semester, d.lesson.class_label].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>Bài / số tiết</dt>
                <dd>{[d.lesson.lesson_title, d.lesson.periods && `${d.lesson.periods} tiết`].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>Trạng thái</dt>
                <dd>{L.lessonStatus[d.lesson.status]}</dd>
                {d.lesson.reflection && (<><dt>Rút kinh nghiệm</dt><dd className="pre">{d.lesson.reflection}</dd></>)}
              </>
            )}
            {d.official && (
              <>
                <dt>Số kí hiệu</dt><dd>{d.official.number || '—'}</dd>
                <dt>Cơ quan ban hành</dt><dd>{d.official.issuer || '—'}</dd>
                <dt>Ngày ban hành</dt><dd>{fmtDate(d.official.issued_date) || '—'}</dd>
                <dt>Loại / lĩnh vực</dt><dd>{[d.official.document_type, d.official.field].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>Hiệu lực</dt>
                <dd>
                  <Badge tone={d.official.validity_status === 'chua_kiem_tra' ? 'warn' : 'neutral'}>{L.validity[d.official.validity_status]}</Badge>
                  {d.official.checked_date && <span className="muted small"> · kiểm tra ngày {fmtDate(d.official.checked_date)}</span>}
                  {d.official.validity_source && (<> · nguồn kiểm tra: <SourceLink value={d.official.validity_source} webLabel="mở link" /></>)}
                </dd>
                {d.official.action_note && (<><dt>Việc cần làm</dt><dd className="pre">{d.official.action_note}</dd></>)}
              </>
            )}
            {d.summary && (<><dt>{d.official ? 'Tóm tắt cá nhân' : 'Mô tả'}</dt><dd className="pre">{d.summary}{d.official && <span className="muted small"> (diễn giải cá nhân, không phải nội dung chính thức)</span>}</dd></>)}
            {d.source_url && (<><dt>{d.official ? 'Nguồn chính thức' : 'Thư mục / nguồn'}</dt><dd><SourceLink value={d.source_url} /></dd></>)}
            <dt>Nhãn</dt>
            <dd>{d.tags.length ? d.tags.map((t: any) => <span key={t.id} className="tag tag-static">#{t.label}</span>) : <span className="muted">Chưa có nhãn</span>}</dd>
            <dt>Cập nhật</dt><dd>{fmtInstant(d.updated_at)}</dd>
          </dl>
        </section>

        <section className="card" aria-labelledby="sec-ver">
          <h2 id="sec-ver" className="card-title">
            Phiên bản &amp; tệp bản gốc
          </h2>
          <ul className="version-list">
            {d.versions.map((v: any) => (
              <li key={v.id} className={v.is_current ? 'is-current' : ''}>
                <div className="version-head">
                  <strong>{v.version_label || 'Phiên bản'}</strong> <span className="muted small">{fmtInstant(v.created_at)}</span>{' '}
                  {v.is_current ? (
                    <Badge tone="ok">Bản hiện hành</Badge>
                  ) : (
                    <button type="button" className="btn btn-small" onClick={() => act(() => post(`/api/documents/${d.id}/current-version`, { version_id: v.id }), `Đã đặt “${v.version_label}” làm bản hiện hành`)}>
                      Đặt làm bản hiện hành
                    </button>
                  )}
                </div>
                {v.notes && <p className="muted small">{v.notes}</p>}
                {v.attachments.length ? (
                  <ul className="att-list">
                    {v.attachments.map((a: any) => (
                      <li key={a.id}>
                        <a href={`/api/attachments/${a.id}/download`} download>
                          {a.original_name}
                        </a>{' '}
                        <span className="muted small">
                          {fmtBytes(a.bytes)} · SHA-256 {a.sha256.slice(0, 12)}…
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">Chưa có tệp.</p>
                )}
              </li>
            ))}
          </ul>
          <Uploader doc={d} onDone={bump} />
        </section>

        <section className="card" aria-labelledby="sec-links">
          <h2 id="sec-links" className="card-title">
            Liên kết
          </h2>
          <h3 className="sub">Tài liệu liên quan</h3>
          {d.related.length ? (
            <ul className="plain">
              {d.related.map((r: any) => (
                <li key={r.id}>
                  <Link to={`/tai-lieu/${r.id}`}>{r.title}</Link> <span className="muted small">({L.category[r.category]})</span>{' '}
                  <button type="button" className="link-btn small" onClick={() => act(() => del(`/api/documents/${d.id}/relations/${r.id}`), 'Đã bỏ liên kết')}>
                    Bỏ liên kết
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Chưa liên kết tài liệu nào.</p>
          )}
          <RelatedPicker doc={d} onDone={bump} />
          <h3 className="sub">Nhiệm vụ</h3>
          <TaskList items={d.tasks} empty="Chưa có nhiệm vụ liên kết." compact />
          <button type="button" className="btn btn-small" onClick={() => openAdd('task', { document_ids: [d.id], title: `Việc cho: ${d.title}` })}>
            + Nhiệm vụ cho tài liệu này
          </button>
          <h3 className="sub">Lịch</h3>
          {d.events.length ? (
            <ul className="plain">
              {d.events.map((e: any) => (
                <li key={e.id}>
                  {e.all_day ? fmtDate(e.start_date) : fmtInstant(e.start_at)} · {e.title}
                  {e.location ? ` · ${e.location}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Chưa gắn lịch.</p>
          )}
          <button type="button" className="btn btn-small" onClick={() => openAdd('event', { document_id: d.id, title: d.category === 'lesson' ? `Dạy: ${d.lesson?.lesson_title || d.title}` : d.title })}>
            + {d.category === 'lesson' ? 'Lịch dạy' : 'Sự kiện'} cho tài liệu này
          </button>
          {d.feedback.length > 0 && (
            <>
              <h3 className="sub">Góp ý trên các phiên bản</h3>
              <ul className="plain">
                {d.feedback.map((f: any) => (
                  <li key={f.id}>
                    {f.content} <Badge>{L.feedback[f.status]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {editing && (
        <Dialog title={`Sửa: ${d.title}`} onClose={() => setEditing(false)} wide>
          <DocumentForm
            category={d.category}
            doc={d}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              toast('Đã lưu thay đổi');
              bump();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
