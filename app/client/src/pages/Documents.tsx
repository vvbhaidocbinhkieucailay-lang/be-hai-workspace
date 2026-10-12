// Danh sách tài liệu dùng chung cho 3 phân hệ: Kế hoạch bài dạy, Tài liệu chuyên môn, Văn bản quản lí.
import { useMemo } from 'react';
import { post, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, fmtDate, schoolYears } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { DocBadges } from '../components/items';
import { Badge, Empty, ErrorBox, Icon, Loading } from '../components/ui';

type Cfg = { category: 'lesson' | 'material' | 'official'; title: string; intro: string; tone: 'teal' };

const CFG: Record<string, Cfg> = {
  lesson: { category: 'lesson', title: 'Kế hoạch bài dạy', intro: 'Thêm, sửa, lưu trữ kế hoạch; lọc theo năm học, môn, khối, học kì; liên kết học liệu và lịch dạy.', tone: 'teal' },
  material: { category: 'material', title: 'Tài liệu chuyên môn', intro: 'Sinh học và Công nghệ: tài liệu, câu hỏi, đề, đáp án, thực hành, HSG. Một tài liệu có thể có nhiều nhãn.', tone: 'teal' },
  official: { category: 'official', title: 'Văn bản quản lí', intro: 'Theo dõi văn bản: số kí hiệu, cơ quan, ngày ban hành, nguồn chính thức, tóm tắt cá nhân và việc cần làm.', tone: 'teal' },
};

function FilterSelect({ label, k, options }: { label: string; k: string; options: [string, string][] }) {
  const { loc, navigate } = useRouter();
  const value = loc.search.get(k) ?? '';
  const id = `f-${k}`;
  return (
    <div className="filter">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const s = new URLSearchParams(loc.search);
          if (e.target.value) s.set(k, e.target.value);
          else s.delete(k);
          navigate(`${loc.path}${s.toString() ? `?${s}` : ''}`, { replace: true });
        }}
      >
        <option value="">Tất cả</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DocumentsPage({ kind }: { kind: 'lesson' | 'material' | 'official' }) {
  const cfg = CFG[kind];
  const { loc, navigate } = useRouter();
  const { refreshKey, openAdd, bump, toast } = useApp();
  const qs = useMemo(() => {
    const s = new URLSearchParams(loc.search);
    s.set('category', kind);
    return s.toString();
  }, [loc.search, kind]);
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/api/documents?${qs}`, refreshKey);
  const facets = useApi<any>('/api/facets', refreshKey).data;
  const tags = useApi<{ items: any[] }>('/api/tags', refreshKey).data;
  const archived = loc.search.get('archived') === '1';
  const subject = loc.search.get('subject');
  const setParam = (k: string, v: string | null) => {
    const s = new URLSearchParams(loc.search);
    if (v) s.set(k, v);
    else s.delete(k);
    navigate(`${loc.path}${s.toString() ? `?${s}` : ''}`, { replace: true });
  };
  const act = async (path: string, body: any, msg: string) => {
    try {
      await post(path, body);
      toast(msg);
      bump();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const years = [...new Set([...(facets?.school_years ?? []), ...schoolYears()])].sort().reverse();
  const hasFilter = [...loc.search.keys()].length > 0;
  return (
    <div className="page">
      <div className="page-head tone-teal">
        <div>
          <p className="eyebrow">Giảng dạy &amp; chuyên môn</p>
          <h1>{cfg.title}</h1>
          <p className="muted">{cfg.intro}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openAdd(kind, subject ? { subject } : undefined)}>
          <Icon name="plus" size={18} /> Thêm {kind === 'lesson' ? 'kế hoạch' : kind === 'official' ? 'văn bản' : 'tài liệu'}
        </button>
      </div>

      {kind === 'material' && (
        <div className="tabs" role="group" aria-label="Chọn môn">
          {[
            ['', 'Tất cả'],
            ['Sinh học', 'Sinh học'],
            ['Công nghệ', 'Công nghệ'],
          ].map(([v, l]) => (
            <button key={l} type="button" className={`tab${(subject ?? '') === v ? ' active' : ''}`} aria-pressed={(subject ?? '') === v} onClick={() => setParam('subject', v || null)}>
              {l}
            </button>
          ))}
        </div>
      )}

      <form className="filters" role="search" aria-label={`Lọc ${cfg.title}`} onSubmit={(e) => e.preventDefault()}>
        <div className="filter filter-q">
          <label htmlFor="f-q">Tìm (tên, mô tả, nhãn, số kí hiệu – gõ không dấu cũng được)</label>
          <input id="f-q" type="search" defaultValue={loc.search.get('q') ?? ''} onChange={(e) => setParam('q', e.target.value.trim() || null)} />
        </div>
        {kind === 'lesson' && <FilterSelect label="Năm học" k="school_year" options={years.map((y) => [y, y])} />}
        {kind !== 'official' && kind !== 'material' && <FilterSelect label="Môn" k="subject" options={[['Sinh học', 'Sinh học'], ['Công nghệ', 'Công nghệ']]} />}
        {kind !== 'official' && <FilterSelect label="Khối" k="grade" options={[['10', '10'], ['11', '11'], ['12', '12']]} />}
        {kind === 'lesson' && <FilterSelect label="Học kì" k="semester" options={[['HK1', 'Học kì 1'], ['HK2', 'Học kì 2']]} />}
        {kind === 'lesson' && <FilterSelect label="Trạng thái" k="status" options={Object.entries(L.lessonStatus)} />}
        {kind === 'material' && <FilterSelect label="Dạng" k="material_type" options={Object.entries(L.materialType)} />}
        {kind === 'material' && subject === 'Công nghệ' && <FilterSelect label="Phân môn" k="tech_branch" options={Object.entries(L.tech)} />}
        {kind === 'official' && <FilterSelect label="Hiệu lực" k="validity_status" options={Object.entries(L.validity)} />}
        {kind === 'official' && <FilterSelect label="Loại văn bản" k="document_type" options={(facets?.document_types ?? []).map((x: string) => [x, x])} />}
        <FilterSelect label="Nhãn" k="tag" options={(tags?.items ?? []).map((t) => [t.label, `${t.label} (${t.count})`])} />
        <div className="filter filter-check">
          <input id="f-arch" type="checkbox" checked={archived} onChange={(e) => setParam('archived', e.target.checked ? '1' : null)} />
          <label htmlFor="f-arch">Chỉ xem mục đã lưu trữ</label>
        </div>
        {hasFilter && (
          <button type="button" className="btn btn-small" onClick={() => navigate(loc.path, { replace: true })}>
            Xóa bộ lọc
          </button>
        )}
      </form>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !data.items.length && (
        <Empty
          action={
            !hasFilter && (
              <button type="button" className="btn btn-primary" onClick={() => openAdd(kind)}>
                Thêm mục đầu tiên
              </button>
            )
          }
        >
          {hasFilter ? 'Không có kết quả khớp bộ lọc. Thử bỏ bớt điều kiện.' : `Chưa có ${cfg.title.toLowerCase()}. Dữ liệu được lưu trong thư mục data của dự án.`}
        </Empty>
      )}
      {data && data.items.length > 0 && (
        <>
          <p className="muted small" role="status">
            {data.items.length} kết quả
          </p>
          <ul className="doc-list">
            {data.items.map((d) => (
              <li key={d.id} className="doc-card card">
                <div className="doc-card-main">
                  <Link to={`/tai-lieu/${d.id}`} className="doc-title">
                    {d.title}
                  </Link>
                  <DocBadges d={d} />
                  <p className="muted small">
                    {d.lesson && [d.lesson.class_label && `Lớp ${d.lesson.class_label}`, d.lesson.semester, d.school_year, d.lesson.periods && `${d.lesson.periods} tiết`].filter(Boolean).join(' · ')}
                    {d.official && [d.official.number, d.official.issuer, d.official.issued_date && `ban hành ${fmtDate(d.official.issued_date)}`].filter(Boolean).join(' · ')}
                    {d.category === 'material' && d.school_year}
                    {' · '}
                    {d.attachment_count ? `${d.attachment_count} tệp` : 'chưa có tệp'}
                    {d.current_version_label && ` · ${d.current_version_label}`}
                  </p>
                  {d.tags.length > 0 && (
                    <p className="tags">
                      {d.tags.map((t: any) => (
                        <button key={t.id} type="button" className="tag" onClick={() => setParam('tag', t.label)} aria-label={`Lọc theo nhãn ${t.label}`}>
                          #{t.label}
                        </button>
                      ))}
                    </p>
                  )}
                </div>
                <div className="doc-card-actions">
                  {!d.archived_at && (
                    <button type="button" className="btn btn-small" aria-pressed={d.pinned} onClick={() => act(`/api/documents/${d.id}/pin`, { pinned: !d.pinned }, d.pinned ? 'Đã bỏ ghim' : 'Đã ghim')}>
                      {d.pinned ? 'Bỏ ghim' : 'Ghim'}
                    </button>
                  )}
                  {d.archived_at ? (
                    <button type="button" className="btn btn-small" onClick={() => act(`/api/documents/${d.id}/restore`, {}, 'Đã khôi phục khỏi lưu trữ')}>
                      Khôi phục
                    </button>
                  ) : (
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => act(`/api/documents/${d.id}/archive`, {}, 'Đã chuyển vào lưu trữ (có thể khôi phục)')}>
                      Lưu trữ
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {kind === 'official' && (
        <p className="note">
          <Badge tone="warn">Lưu ý</Badge> Ứng dụng không tự xác nhận hiệu lực văn bản. Tóm tắt là diễn giải cá nhân, không thay thế văn bản gốc.
        </p>
      )}
    </div>
  );
}
