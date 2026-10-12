// Lịch & nhiệm vụ: chế độ tuần/tháng dùng cùng API /api/calendar (cùng dữ liệu), danh sách nhiệm vụ có lọc.
import { useEffect, useMemo, useState } from 'react';
import { post, useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { L, WEEKDAYS, WEEKDAYS_SHORT, addDays, fmtDate, mondayOf, todayVN } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { TaskList } from '../components/items';
import { Dialog, Empty, ErrorBox, Icon, Loading } from '../components/ui';
import { EventForm } from '../features/forms';

function monthGrid(anchor: string) {
  const first = `${anchor.slice(0, 7)}-01`;
  const start = mondayOf(first);
  const nextMonth = addDays(first, 32).slice(0, 7) + '-01';
  const end = addDays(mondayOf(addDays(nextMonth, -1)), 7);
  return { start, end, first, nextMonth };
}

export function CalendarPage() {
  const { loc, navigate } = useRouter();
  const { refreshKey, openAdd, bump, toast } = useApp();
  const view = loc.search.get('view') === 'thang' ? 'month' : 'week';
  const anchor = loc.search.get('d') ?? todayVN();
  const today = todayVN();
  const range = useMemo(() => {
    if (view === 'week') {
      const s = mondayOf(anchor);
      return { from: s, to: addDays(s, 7) };
    }
    const g = monthGrid(anchor);
    return { from: g.start, to: g.end };
  }, [view, anchor]);
  const cal = useApi<any>(`/api/calendar?from=${range.from}&to=${range.to}`, refreshKey);
  const [editEvent, setEditEvent] = useState<any>(null);

  const setQ = (k: string, v: string | null) => {
    const s = new URLSearchParams(loc.search);
    if (v) s.set(k, v);
    else s.delete(k);
    navigate(`${loc.path}?${s}`, { replace: true });
  };
  const shift = (dir: number) => {
    const next = view === 'week' ? addDays(anchor, 7 * dir) : (() => {
      const [y, m] = anchor.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + dir, 1));
      return d.toISOString().slice(0, 10);
    })();
    setQ('d', next);
  };

  // Danh sách nhiệm vụ có lọc
  const taskQs = useMemo(() => {
    const s = new URLSearchParams();
    for (const k of ['status', 'priority', 'due', 'q', 'archived']) {
      const v = loc.search.get(`t_${k}`) ?? (k === 'due' ? loc.search.get('due') : null);
      if (v) s.set(k, v);
    }
    if (!s.has('status') && !s.has('archived')) s.set('open', loc.search.get('t_all') === '1' ? '0' : '1');
    return s.toString();
  }, [loc.search]);
  const tasks = useApi<{ items: any[] }>(`/api/tasks?${taskQs}`, refreshKey);

  useEffect(() => {
    if (window.location.hash === '#nhiem-vu') document.getElementById('nhiem-vu')?.scrollIntoView();
  }, []);

  const days = Array.from({ length: Math.round((Date.parse(range.to) - Date.parse(range.from)) / 864e5) }, (_, i) => addDays(range.from, i));
  const itemsOn = (d: string) => {
    const data = cal.data;
    if (!data) return { evs: [], tks: [] };
    return {
      evs: data.events.filter((e: any) => (e.all_day ? e.start_date <= d && e.end_date > d : e.start_local.date === d || (e.end_local && e.start_local.date < d && e.end_local.date >= d))),
      tks: data.tasks.filter((t: any) => t.due_local?.date === d),
    };
  };
  const monthLabel = `Tháng ${Number(anchor.slice(5, 7))}/${anchor.slice(0, 4)}`;
  const archiveEvent = async (e: any) => {
    try {
      await post(`/api/events/${e.id}/archive`);
      toast('Đã lưu trữ sự kiện (có thể khôi phục)');
      setEditEvent(null);
      bump();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-head tone-violet">
        <div>
          <p className="eyebrow">Công việc &amp; luận văn</p>
          <h1>Lịch &amp; nhiệm vụ</h1>
          <p className="muted">Tuần bắt đầu thứ Hai · giờ Việt Nam (Asia/Ho_Chi_Minh). Tuần và tháng hiển thị cùng một dữ liệu.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={() => openAdd('event', { start_date: anchor })}>
            <Icon name="calendar" size={18} /> Thêm sự kiện
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openAdd('task')}>
            <Icon name="plus" size={18} /> Thêm nhiệm vụ
          </button>
        </div>
      </div>

      <section className="card" aria-labelledby="cal-title">
        <div className="cal-toolbar">
          <div className="tabs" role="group" aria-label="Chế độ xem">
            <button type="button" className={`tab${view === 'week' ? ' active' : ''}`} aria-pressed={view === 'week'} onClick={() => setQ('view', null)}>
              Tuần
            </button>
            <button type="button" className={`tab${view === 'month' ? ' active' : ''}`} aria-pressed={view === 'month'} onClick={() => setQ('view', 'thang')}>
              Tháng
            </button>
          </div>
          <div className="cal-nav">
            <button type="button" className="btn btn-small" onClick={() => shift(-1)} aria-label={view === 'week' ? 'Tuần trước' : 'Tháng trước'}>
              ‹ Trước
            </button>
            <button type="button" className="btn btn-small" onClick={() => setQ('d', null)}>
              Hôm nay
            </button>
            <button type="button" className="btn btn-small" onClick={() => shift(1)} aria-label={view === 'week' ? 'Tuần sau' : 'Tháng sau'}>
              Sau ›
            </button>
          </div>
          <h2 id="cal-title" className="cal-title">
            {view === 'week' ? `Tuần ${fmtDate(range.from)} – ${fmtDate(addDays(range.to, -1))}` : monthLabel}
          </h2>
        </div>
        {cal.loading && !cal.data && <Loading />}
        {cal.error && <ErrorBox message={cal.error} onRetry={cal.reload} />}
        {cal.data && (
          <div className={view === 'week' ? 'cal-week' : 'cal-month'} role="grid" aria-label={view === 'week' ? 'Lịch tuần' : 'Lịch tháng'}>
            {view === 'month' && (
              <div className="cal-month-head" role="row">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} role="columnheader">
                    <span className="wd-long">{w}</span>
                    <span className="wd-short" aria-hidden="true">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="cal-cells" role="rowgroup">
              {days.map((d, i) => {
                const { evs, tks } = itemsOn(d);
                const out = view === 'month' && d.slice(0, 7) !== anchor.slice(0, 7);
                return (
                  <div key={d} role="gridcell" className={`cal-cell${d === today ? ' is-today' : ''}${out ? ' is-out' : ''}`} aria-label={`${WEEKDAYS[i % 7]} ${fmtDate(d)}`}>
                    <div className="cal-cell-head">
                      {view === 'week' && <span className="wd">{WEEKDAYS[i]}</span>}
                      <span className="dn">{view === 'week' ? fmtDate(d).slice(0, 5) : Number(d.slice(8))}</span>
                      {d === today && <span className="today-tag">Hôm nay</span>}
                    </div>
                    <ul>
                      {evs.map((e: any) => (
                        <li key={e.id}>
                          <button type="button" className="cal-chip chip-event" onClick={() => setEditEvent(e)} title={e.location ?? ''}>
                            {e.all_day ? 'Cả ngày' : e.start_local.time} {e.title}
                          </button>
                        </li>
                      ))}
                      {tks.map((t: any) => (
                        <li key={t.id}>
                          <Link to={`/nhiem-vu/${t.id}`} className={`cal-chip chip-task${t.overdue ? ' chip-overdue' : ''}${t.status === 'hoan_tat' ? ' chip-done' : ''}`}>
                            {t.status === 'hoan_tat' ? '✓' : t.overdue ? 'Quá hạn:' : 'Hạn'}
                            {t.due_local?.time ? ` ${t.due_local.time}` : ''} {t.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {cal.data.events.length + cal.data.tasks.length === 0 && <p className="muted center">Không có sự kiện hay hạn việc trong khoảng này.</p>}
          </div>
        )}
      </section>

      <section className="card" id="nhiem-vu" aria-labelledby="task-title">
        <h2 id="task-title" className="card-title">
          Nhiệm vụ
        </h2>
        <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc nhiệm vụ">
          <div className="filter filter-q">
            <label htmlFor="t-q">Tìm nhiệm vụ</label>
            <input id="t-q" type="search" defaultValue={loc.search.get('t_q') ?? ''} onChange={(e) => setQ('t_q', e.target.value.trim() || null)} />
          </div>
          <div className="filter">
            <label htmlFor="t-due">Hạn</label>
            <select id="t-due" value={loc.search.get('t_due') ?? loc.search.get('due') ?? ''} onChange={(e) => { setQ('t_due', e.target.value || null); }}>
              <option value="">Tất cả</option>
              <option value="overdue">Quá hạn</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày tới</option>
              <option value="none">Chưa đặt hạn</option>
            </select>
          </div>
          <div className="filter">
            <label htmlFor="t-st">Trạng thái</label>
            <select id="t-st" value={loc.search.get('t_status') ?? ''} onChange={(e) => setQ('t_status', e.target.value || null)}>
              <option value="">Đang mở</option>
              {Object.entries(L.taskStatus).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="filter">
            <label htmlFor="t-pr">Ưu tiên</label>
            <select id="t-pr" value={loc.search.get('t_priority') ?? ''} onChange={(e) => setQ('t_priority', e.target.value || null)}>
              <option value="">Tất cả</option>
              <option value="cao">Cao</option>
              <option value="trung_binh">Trung bình</option>
              <option value="thap">Thấp</option>
            </select>
          </div>
          <div className="filter filter-check">
            <input id="t-arch" type="checkbox" checked={loc.search.get('t_archived') === '1'} onChange={(e) => setQ('t_archived', e.target.checked ? '1' : null)} />
            <label htmlFor="t-arch">Đã lưu trữ</label>
          </div>
        </form>
        {tasks.loading && !tasks.data && <Loading />}
        {tasks.error && <ErrorBox message={tasks.error} onRetry={tasks.reload} />}
        {tasks.data &&
          (tasks.data.items.length ? (
            <TaskList items={tasks.data.items} empty="" />
          ) : (
            <Empty action={<button type="button" className="btn btn-primary" onClick={() => openAdd('task')}>Thêm nhiệm vụ</button>}>Không có nhiệm vụ phù hợp.</Empty>
          ))}
      </section>

      {editEvent && (
        <Dialog title={`Sự kiện: ${editEvent.title}`} onClose={() => setEditEvent(null)} wide>
          {editEvent.document_title && (
            <p className="muted small">
              Gắn với tài liệu: <Link to={`/tai-lieu/${editEvent.document_id}`}>{editEvent.document_title}</Link>
            </p>
          )}
          <EventForm
            event={editEvent}
            onCancel={() => setEditEvent(null)}
            onDone={() => {
              setEditEvent(null);
              toast('Đã lưu sự kiện');
              bump();
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={() => archiveEvent(editEvent)}>
            Lưu trữ sự kiện này
          </button>
        </Dialog>
      )}
    </div>
  );
}
