// Hiển thị mục nhiệm vụ / tài liệu dùng lại ở nhiều trang (cùng một bản ghi, không sao chép).
import { post } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, fmtDate, fmtDue, isLocalPath } from '../lib/format';
import { Link } from '../lib/router';
import { Badge, Icon } from './ui';

export function TaskStatusBadge({ t }: { t: any }) {
  if (t.overdue) return <Badge tone="danger">Quá hạn</Badge>;
  if (t.status === 'hoan_tat') return <Badge tone="ok">Hoàn tất</Badge>;
  if (t.status === 'huy') return <Badge>Đã hủy</Badge>;
  return <Badge tone={t.status === 'cho_phan_hoi' ? 'warn' : 'neutral'}>{L.taskStatus[t.status]}</Badge>;
}

export function PriorityBadge({ p }: { p: string }) {
  return <Badge tone={p === 'cao' ? 'warn' : 'neutral'}>{L.priority[p]}</Badge>;
}

export function TaskRow({ t, compact }: { t: any; compact?: boolean }) {
  const { bump, toast } = useApp();
  const done = t.status === 'hoan_tat';
  const toggle = async () => {
    try {
      await post(`/api/tasks/${t.id}/status`, { status: done ? 'chua_lam' : 'hoan_tat' });
      toast(done ? 'Đã mở lại nhiệm vụ' : 'Đã đánh dấu hoàn tất');
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <li className={`task-row${done ? ' is-done' : ''}${t.overdue ? ' is-overdue' : ''}`}>
      <input type="checkbox" checked={done} onChange={toggle} aria-label={`${done ? 'Bỏ hoàn tất' : 'Hoàn tất'}: ${t.title}`} disabled={t.status === 'huy'} />
      <div className="task-main">
        <Link to={`/nhiem-vu/${t.id}`} className="task-title">
          {t.title}
        </Link>
        <div className="task-meta">
          <span className="due">Hạn: {fmtDue(t)}</span>
          <TaskStatusBadge t={t} />
          {!compact && t.priority === 'cao' && <PriorityBadge p={t.priority} />}
          {!compact && t.project_id && <Badge tone="violet">Luận văn</Badge>}
          {!compact && t.emails?.length > 0 && <Badge tone="violet">Từ email</Badge>}
          {!compact && t.documents?.length > 0 && <Badge tone="teal">{t.documents.length} tài liệu</Badge>}
        </div>
      </div>
    </li>
  );
}

export function TaskList({ items, empty, compact }: { items: any[]; empty: string; compact?: boolean }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="task-list">
      {items.map((t) => (
        <TaskRow key={t.id} t={t} compact={compact} />
      ))}
    </ul>
  );
}

export function DocMini({ d }: { d: any }) {
  return (
    <li className="doc-mini">
      <Icon name={d.category === 'official' ? 'stamp' : d.category === 'thesis' ? 'thesis' : d.category === 'lesson' ? 'book' : 'flask'} size={18} className={d.category === 'thesis' ? 'c-violet' : 'c-teal'} />
      <div>
        <Link to={`/tai-lieu/${d.id}`}>{d.title}</Link>
        <div className="muted small">
          {L.category[d.category]}
          {d.current_version_label ? ` · ${d.current_version_label}` : ''} · cập nhật {fmtDate(d.updated_at?.slice(0, 10))}
        </div>
      </div>
    </li>
  );
}

export function DocBadges({ d }: { d: any }) {
  return (
    <span className="badges">
      {d.archived_at && <Badge>Đã lưu trữ</Badge>}
      {d.pinned && <Badge tone="teal">Đã ghim</Badge>}
      {d.subject && <Badge tone="teal">{d.subject}</Badge>}
      {d.grade && <Badge>Khối {d.grade}</Badge>}
      {d.tech_branch && <Badge>{L.tech[d.tech_branch]}</Badge>}
      {d.material_type && <Badge>{L.materialType[d.material_type] ?? L.thesisType[d.material_type]}</Badge>}
      {d.lesson && <Badge tone={d.lesson.status === 'can_dieu_chinh' ? 'warn' : d.lesson.status === 'san_sang' ? 'ok' : 'neutral'}>{L.lessonStatus[d.lesson.status]}</Badge>}
      {d.official && (
        <Badge tone={d.official.validity_status === 'chua_kiem_tra' ? 'warn' : 'neutral'}>{L.validity[d.official.validity_status]}</Badge>
      )}
    </span>
  );
}

/** Hiển thị nguồn: đường dẫn thư mục/tệp trên máy (mở bằng File Explorer qua máy chủ cục bộ) hoặc link web. */
export function SourceLink({ value, webLabel }: { value?: string | null; webLabel?: string }) {
  const { toast } = useApp();
  if (!value) return <span className="muted">—</span>;
  if (!isLocalPath(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {webLabel ?? value} ↗
      </a>
    );
  }
  const open = async () => {
    try {
      const r = await post('/api/system/open-path', { path: value });
      toast(r.ok ? `Đã mở ${r.kind === 'file' ? 'thư mục chứa tệp' : 'thư mục'} trong File Explorer` : r.message);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Đã sao chép đường dẫn – dán vào thanh địa chỉ File Explorer');
    } catch {
      toast('Không sao chép tự động được – hãy bôi đen đường dẫn và nhấn Ctrl+C', 'error');
    }
  };
  return (
    <span className="source-path">
      <code title="Đường dẫn trên máy">{value}</code>
      <span className="row-actions">
        <button type="button" className="btn btn-small" onClick={open}>
          Mở thư mục
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={copy}>
          Sao chép đường dẫn
        </button>
      </span>
    </span>
  );
}
