// Hồ sơ luận văn: mốc bảo vệ (chỉ đếm ngược khi đã xác nhận năm), tiến độ từ đầu việc thực, tài liệu/phiên bản, góp ý–giải trình, lịch tập, việc sau bảo vệ.
import { useState } from 'react';
import { post, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, fmtDate, fmtInstant } from '../lib/format';
import { Link } from '../lib/router';
import { TaskList } from '../components/items';
import { Badge, Dialog, ErrorBox, Icon, Loading } from '../components/ui';
import { FeedbackForm, ProjectForm } from '../features/forms';

const PID = 'prj_luan_van';

export function ThesisPage() {
  const { refreshKey, bump, toast, openAdd } = useApp();
  const { data: p, error, loading, reload } = useApi<any>(`/api/projects/${PID}`, refreshKey);
  const [editProject, setEditProject] = useState(false);
  const [fb, setFb] = useState<any>(null);
  if (loading && !p) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!p) return null;
  const before = p.tasks.filter((t: any) => t.phase !== 'sau_bao_ve');
  const after = p.tasks.filter((t: any) => t.phase === 'sau_bao_ve');
  const fbTask = async (f: any) => {
    try {
      const r = await post(`/api/feedback/${f.id}/create-task`, {});
      toast(r.created ? 'Đã tạo nhiệm vụ giải trình' : 'Góp ý đã có nhiệm vụ – không tạo trùng');
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div className="page">
      <div className="page-head tone-violet">
        <div>
          <p className="eyebrow">Công việc &amp; luận văn</p>
          <h1>Hồ sơ luận văn</h1>
          <p className="muted">{p.name}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={() => openAdd('thesis')}>
            <Icon name="plus" size={18} /> Tài liệu luận văn
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openAdd('task', { project_id: PID, phase: 'truoc_bao_ve', required_for_progress: true })}>
            <Icon name="plus" size={18} /> Đầu việc
          </button>
        </div>
      </div>

      <div className="thesis-top">
        <section className="card attn-thesis" aria-labelledby="def-title">
          <h2 id="def-title" className="card-title">
            Mốc bảo vệ
          </h2>
          <p className="big-date">{p.defense.label}</p>
          <p className="small">
            Giờ: {p.defense.time ?? <span className="muted">chưa xác nhận</span>} · Địa điểm: {p.defense.location ?? <span className="muted">chưa xác nhận</span>}
          </p>
          {p.defense.needs_confirmation ? (
            <p>
              <Badge tone="warn">Cần xác nhận</Badge> <span className="muted small">Chưa đếm ngược cho tới khi xác nhận đủ ngày/tháng/năm.</span>
            </p>
          ) : (
            p.defense.countdown_days !== null && <Badge tone="violet">{p.defense.countdown_days >= 0 ? `Còn ${p.defense.countdown_days} ngày` : `Đã qua ${-p.defense.countdown_days} ngày`}</Badge>
          )}
          <p>
            <button type="button" className="btn btn-small" onClick={() => setEditProject(true)}>
              Cập nhật mốc bảo vệ
            </button>
          </p>
        </section>
        <section className="card" aria-labelledby="prog-title">
          <h2 id="prog-title" className="card-title">
            Tiến độ
          </h2>
          {p.progress.percent === null ? (
            <p className="muted">{p.progress.label}. Thêm đầu việc và đánh dấu “bắt buộc” để tính tiến độ.</p>
          ) : (
            <>
              <div className="progress" role="progressbar" aria-valuenow={p.progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ luận văn">
                <span style={{ width: `${p.progress.percent}%` }} />
              </div>
              <p>{p.progress.label}</p>
            </>
          )}
          <p className="muted small">Tính bằng: đầu việc bắt buộc đã hoàn tất / đầu việc bắt buộc không hủy.</p>
        </section>
      </div>

      <div className="detail-grid">
        <section className="card" aria-labelledby="th-docs">
          <h2 id="th-docs" className="card-title">
            Bản thảo, hồ sơ, slide, câu hỏi
          </h2>
          {p.documents.length ? (
            <ul className="plain doc-rows">
              {p.documents.map((d: any) => (
                <li key={d.id}>
                  <Link to={`/tai-lieu/${d.id}`}>{d.title}</Link>{' '}
                  {d.material_type && <Badge>{L.thesisType[d.material_type]}</Badge>}{' '}
                  <span className="muted small">
                    Hiện hành: {d.current_version_label ?? '—'} · {d.version_count} phiên bản
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Chưa có tài liệu. Thêm bản thảo rồi tải tệp lên từng phiên bản; chỉ một bản được đánh dấu hiện hành.</p>
          )}
          <button type="button" className="btn btn-small" onClick={() => openAdd('thesis')}>
            + Thêm tài liệu luận văn
          </button>
        </section>

        <section className="card" aria-labelledby="th-fb">
          <h2 id="th-fb" className="card-title">
            Góp ý &amp; giải trình
          </h2>
          {p.feedback.length ? (
            <ul className="plain fb-list">
              {p.feedback.map((f: any) => (
                <li key={f.id}>
                  <p>
                    <strong>{f.reviewer || 'Góp ý'}</strong>
                    {f.section_ref && <span className="muted"> · {f.section_ref}</span>} <Badge tone={f.status === 'da_giai_trinh' ? 'ok' : f.status === 'moi' ? 'warn' : 'neutral'}>{L.feedback[f.status]}</Badge>
                  </p>
                  <p className="pre">{f.content}</p>
                  {f.response_note && <p className="pre muted small">Giải trình: {f.response_note}</p>}
                  <p className="small muted">
                    {f.document_title ? (
                      <>
                        Trên bản: <Link to={`/tai-lieu/${f.document_id}`}>{f.document_title}</Link> – {f.version_label}
                      </>
                    ) : (
                      'Không gắn bản cụ thể'
                    )}
                    {f.task_title && (
                      <>
                        {' '}
                        · Nhiệm vụ: <Link to={`/nhiem-vu/${f.linked_task_id}`}>{f.task_title}</Link> ({L.taskStatus[f.task_status]})
                      </>
                    )}
                  </p>
                  <div className="row-actions">
                    <button type="button" className="btn btn-small" onClick={() => setFb(f)}>
                      Sửa / giải trình
                    </button>
                    {!f.linked_task_id && (
                      <button type="button" className="btn btn-small" onClick={() => fbTask(f)}>
                        Tạo nhiệm vụ
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Chưa có góp ý.</p>
          )}
          <button type="button" className="btn btn-small" onClick={() => setFb({})}>
            + Thêm góp ý
          </button>
        </section>

        <section className="card" aria-labelledby="th-tasks">
          <h2 id="th-tasks" className="card-title">
            Đầu việc trước bảo vệ
          </h2>
          <TaskList items={before} empty="Chưa có đầu việc." />
          <h3 className="sub">Công việc sau bảo vệ</h3>
          <TaskList items={after} empty="Chưa có việc sau bảo vệ." />
          <button type="button" className="btn btn-small" onClick={() => openAdd('task', { project_id: PID, phase: 'sau_bao_ve' })}>
            + Việc sau bảo vệ
          </button>
        </section>

        <section className="card" aria-labelledby="th-ev">
          <h2 id="th-ev" className="card-title">
            Lịch tập &amp; lịch liên quan
          </h2>
          {p.events.length ? (
            <ul className="plain">
              {p.events.map((e: any) => (
                <li key={e.id}>
                  <strong>{e.all_day ? fmtDate(e.start_date) : fmtInstant(e.start_at)}</strong> · {e.title}
                  {e.location ? ` · ${e.location}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Chưa có lịch tập sắp tới.</p>
          )}
          <button type="button" className="btn btn-small" onClick={() => openAdd('event', { project_id: PID, title: 'Tập dượt bảo vệ' })}>
            + Lịch tập
          </button>
        </section>
      </div>

      {editProject && (
        <Dialog title="Cập nhật mốc bảo vệ" onClose={() => setEditProject(false)} wide>
          <ProjectForm
            project={p}
            onCancel={() => setEditProject(false)}
            onDone={() => {
              setEditProject(false);
              toast('Đã lưu mốc bảo vệ');
              bump();
            }}
          />
        </Dialog>
      )}
      {fb && (
        <Dialog title={fb.id ? 'Sửa góp ý / giải trình' : 'Thêm góp ý'} onClose={() => setFb(null)} wide>
          <FeedbackForm
            projectId={PID}
            item={fb.id ? fb : undefined}
            onCancel={() => setFb(null)}
            onDone={() => {
              setFb(null);
              toast('Đã lưu góp ý');
              bump();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
