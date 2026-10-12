// Trang tổng quan: giới thiệu gọn → việc cần chú ý → hai khối/sáu phân hệ → lịch tuần & sắp đến hạn → truy cập nhanh.
import { useApi } from '../lib/api';
import { useApp } from '../lib/appContext';
import { CURRENT_SCHOOL_YEAR, WEEKDAYS_SHORT, addDays, fmtDate, fmtDue } from '../lib/format';
import { Link } from '../lib/router';
import { DocMini, TaskList, TaskStatusBadge } from '../components/items';
import { Badge, ErrorBox, Icon, Loading } from '../components/ui';

function ModuleRow({ to, icon, title, desc, stat }: { to: string; icon: string; title: string; desc: string; stat: string }) {
  return (
    <li>
      <Link to={to} className="module-row">
        <span className="module-icon">
          <Icon name={icon} size={22} />
        </span>
        <span className="module-text">
          <strong>{title}</strong>
          <span className="muted">{desc}</span>
          <span className="module-stat">{stat}</span>
        </span>
        <Icon name="arrow" size={18} className="module-arrow" />
      </Link>
    </li>
  );
}

function WeekStrip({ week, today }: { week: any; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.from, i));
  return (
    <ol className="week-strip" aria-label={`Lịch tuần từ ${fmtDate(week.from)}`}>
      {days.map((d, i) => {
        const evs = week.events.filter((e: any) => (e.all_day ? e.start_date <= d && e.end_date > d : e.start_local.date === d));
        const tks = week.tasks.filter((t: any) => t.due_local?.date === d);
        return (
          <li key={d} className={`week-day${d === today ? ' is-today' : ''}`}>
            <div className="week-day-head">
              <span>{WEEKDAYS_SHORT[i]}</span> <span className="muted">{fmtDate(d).slice(0, 5)}</span>
              {d === today && <span className="sr-only"> (hôm nay)</span>}
            </div>
            {evs.length + tks.length === 0 && <span className="muted small">—</span>}
            <ul>
              {evs.map((e: any) => (
                <li key={e.id} className="cal-chip chip-event">
                  {e.all_day ? 'Cả ngày' : e.start_local.time} · {e.title}
                </li>
              ))}
              {tks.map((t: any) => (
                <li key={t.id} className={`cal-chip chip-task${t.overdue ? ' chip-overdue' : ''}${t.status === 'hoan_tat' ? ' chip-done' : ''}`}>
                  <Link to={`/nhiem-vu/${t.id}`}>
                    {t.status === 'hoan_tat' ? '✓ ' : 'Hạn: '}
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function Home() {
  const { refreshKey, openAdd } = useApp();
  const { data: o, error, loading, reload } = useApi<any>('/api/overview', refreshKey);
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero-pill">Năm học {CURRENT_SCHOOL_YEAR} · Giảng dạy · Chuyên môn · Công việc · Luận văn</p>
        <h1 id="hero-title">
          Không gian làm việc <span className="c-teal">Bé Hai</span>
        </h1>
        <p className="hero-sub">Biết việc cần làm, tìm đúng tài liệu, theo dõi tiến độ giảng dạy và luận văn — dữ liệu lưu ngay trên máy này (ổ D).</p>
      </section>

      {loading && !o && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {o && (
        <>
          <section className="attention" aria-label="Việc cần chú ý">
            <article className="card attn-card">
              <h2 className="card-title">Việc ưu tiên</h2>
              {o.priorities.length ? (
                <ol className="attn-list">
                  {o.priorities.map((t: any) => (
                    <li key={t.id}>
                      <Link to={`/nhiem-vu/${t.id}`}>{t.title}</Link>
                      <span className="muted small"> · {fmtDue(t)} </span>
                      <TaskStatusBadge t={t} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">
                  Chưa có việc đang mở.{' '}
                  <button type="button" className="link-btn" onClick={() => openAdd('task')}>
                    Thêm việc đầu tiên
                  </button>
                </p>
              )}
              <Link to="/lich-cong-viec#nhiem-vu" className="card-link">
                Xem tất cả nhiệm vụ ({o.open_task_count} đang mở)
              </Link>
            </article>
            <article className="card attn-card">
              <h2 className="card-title">Hạn gần nhất</h2>
              {o.next_due ? (
                <p>
                  <Link to={`/nhiem-vu/${o.next_due.id}`} className="strong">
                    {o.next_due.title}
                  </Link>
                  <br />
                  <span className="muted">{fmtDue(o.next_due)}</span>
                </p>
              ) : (
                <p className="muted">Chưa có việc nào sắp đến hạn.</p>
              )}
              {o.overdue_count > 0 ? (
                <p>
                  <Badge tone="danger">Quá hạn: {o.overdue_count} việc</Badge>{' '}
                  <Link to="/lich-cong-viec?due=overdue#nhiem-vu">Xem việc quá hạn</Link>
                </p>
              ) : (
                <p className="muted small">Không có việc quá hạn.</p>
              )}
            </article>
            <article className="card attn-card attn-thesis">
              <h2 className="card-title">Mốc bảo vệ luận văn</h2>
              {o.thesis ? (
                <>
                  <p className="big-date">{o.thesis.defense.label}</p>
                  {o.thesis.defense.needs_confirmation ? (
                    <p>
                      <Badge tone="warn">Cần xác nhận</Badge> <span className="muted small">Chưa đếm ngược khi chưa xác nhận năm.</span>
                    </p>
                  ) : (
                    o.thesis.defense.countdown_days !== null && (
                      <p>
                        <Badge tone="violet">{o.thesis.defense.countdown_days >= 0 ? `Còn ${o.thesis.defense.countdown_days} ngày` : `Đã qua ${-o.thesis.defense.countdown_days} ngày`}</Badge>
                      </p>
                    )
                  )}
                  <p className="muted small">Tiến độ: {o.thesis.progress.label}</p>
                </>
              ) : (
                <p className="muted">Chưa có dự án luận văn.</p>
              )}
              <Link to="/luan-van" className="card-link">
                Mở hồ sơ luận văn
              </Link>
            </article>
          </section>

          <section className="blocks" aria-label="Hai nhóm công việc">
            <article className="block block-teal" aria-labelledby="blk-teach">
              <header className="block-head">
                <span className="block-icon">
                  <Icon name="cap" size={26} />
                </span>
                <div>
                  <p className="eyebrow">Sinh học · Công nghệ</p>
                  <h2 id="blk-teach">Giảng dạy &amp; chuyên môn</h2>
                </div>
              </header>
              <ul className="module-list">
                <ModuleRow to="/ke-hoach-bai-day" icon="book" title="Kế hoạch bài dạy" desc="Theo năm học, môn, khối, học kì; liên kết học liệu và lịch dạy."
                  stat={o.modules.lesson.total ? `${o.modules.lesson.total} kế hoạch · ${o.modules.lesson.dang_soan} đang soạn · ${o.modules.lesson.can_dieu_chinh} cần điều chỉnh` : 'Chưa có kế hoạch – bấm để thêm'} />
                <ModuleRow to="/chuyen-mon" icon="flask" title="Tài liệu chuyên môn" desc="Tài liệu, câu hỏi, đề, đáp án, thực hành, HSG; Công nghệ chia 4 phân môn."
                  stat={o.modules.material.total ? `${o.modules.material.total} tài liệu · Sinh học ${o.modules.material.sinh_hoc} · Công nghệ ${o.modules.material.cong_nghe}` : 'Chưa có tài liệu – bấm để thêm'} />
                <ModuleRow to="/van-ban" icon="stamp" title="Văn bản quản lí" desc="Số kí hiệu, cơ quan, ngày ban hành, nguồn chính thức, việc cần làm."
                  stat={o.modules.official.total ? `${o.modules.official.total} văn bản · ${o.modules.official.chua_kiem_tra} chưa kiểm tra hiệu lực` : 'Chưa có văn bản – bấm để thêm'} />
              </ul>
            </article>
            <article className="block block-violet" aria-labelledby="blk-work">
              <header className="block-head">
                <span className="block-icon">
                  <Icon name="briefcase" size={26} />
                </span>
                <div>
                  <p className="eyebrow">Lịch · Email · Luận văn</p>
                  <h2 id="blk-work">Công việc &amp; luận văn</h2>
                </div>
              </header>
              <ul className="module-list">
                <ModuleRow to="/lich-cong-viec" icon="calendar" title="Lịch & nhiệm vụ" desc="Tuần/tháng cùng dữ liệu; hạn, ưu tiên, trạng thái."
                  stat={`${o.modules.calendar.open_tasks} việc đang mở · ${o.modules.calendar.overdue} quá hạn · ${o.modules.calendar.events_this_week} sự kiện tuần này`} />
                <ModuleRow to="/email-quan-trong" icon="mail" title="Email quan trọng" desc="Nhập tay tiêu đề, người gửi, hạn; tạo nhiệm vụ liên kết."
                  stat={o.modules.email.total ? `${o.modules.email.open} email chưa xong / ${o.modules.email.total}` : 'Chưa có email theo dõi – bấm để thêm'} />
                <ModuleRow to="/luan-van" icon="thesis" title="Hồ sơ luận văn" desc="Bản thảo & phiên bản, góp ý/giải trình, slide, lịch tập, sau bảo vệ."
                  stat={`${o.modules.thesis.documents} tài liệu · ${o.modules.thesis.open_feedback} góp ý chưa xử lí`} />
              </ul>
            </article>
          </section>

          <section className="doing" aria-labelledby="doing-title">
            <div className="section-head">
              <h2 id="doing-title">Đang thực hiện</h2>
              <Link to="/lich-cong-viec">Mở lịch đầy đủ</Link>
            </div>
            <div className="doing-grid">
              <div className="card">
                <h3 className="card-title">
                  Lịch tuần {fmtDate(o.week.from)} – {fmtDate(addDays(o.week.to, -1))}
                </h3>
                <WeekStrip week={o.week} today={o.today} />
              </div>
              <div className="card">
                <h3 className="card-title">Sắp đến hạn (14 ngày)</h3>
                <TaskList items={o.upcoming_tasks} empty="Không có việc nào đến hạn trong 14 ngày tới." compact />
              </div>
            </div>
          </section>

          <section className="quick" aria-labelledby="quick-title">
            <div className="section-head">
              <h2 id="quick-title">Truy cập nhanh tài liệu</h2>
            </div>
            <div className="quick-grid">
              {[
                ['Đã ghim', o.documents.pinned, 'Chưa ghim tài liệu nào. Mở một tài liệu và bấm “Ghim”.'],
                ['Vừa cập nhật', o.documents.recent, 'Chưa có tài liệu.'],
                ['Đang dùng (mở gần đây)', o.documents.in_use, 'Chưa mở tài liệu nào.'],
              ].map(([title, list, empty]) => (
                <div className="card" key={title as string}>
                  <h3 className="card-title">{title as string}</h3>
                  {(list as any[]).length ? (
                    <ul className="doc-mini-list">
                      {(list as any[]).map((d) => (
                        <DocMini key={d.id} d={d} />
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{empty as string}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
