// Header ngang: nhận diện, 3 mục điều hướng (2 mục có menu con), tìm kiếm, Thêm mới.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp, type AddKind } from '../lib/appContext';
import { Link, useRouter } from '../lib/router';
import { Icon } from './ui';

const TEACH = [
  ['/ke-hoach-bai-day', 'Kế hoạch bài dạy'],
  ['/chuyen-mon', 'Tài liệu chuyên môn'],
  ['/van-ban', 'Văn bản quản lí'],
];
const WORK = [
  ['/lich-cong-viec', 'Lịch & nhiệm vụ'],
  ['/email-quan-trong', 'Email quan trọng'],
  ['/luan-van', 'Hồ sơ luận văn'],
];

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        ref.current?.querySelector<HTMLElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function Menu({ label, items, tone, active }: { label: string; items: string[][]; tone: 'teal' | 'violet'; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const { loc } = useRouter();
  useEffect(() => setOpen(false), [loc.path]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className={`nav-link menu-btn tone-${tone}${active ? ' active' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        {label} <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="menu-pop" role="list">
          {items.map(([to, l]) => (
            <li key={to}>
              <Link to={to} className={loc.path.startsWith(to) ? 'current' : ''} aria-current={loc.path.startsWith(to) ? 'page' : undefined}>
                {l}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ADD: [AddKind, string][] = [
  ['lesson', 'Kế hoạch bài dạy'],
  ['material', 'Tài liệu chuyên môn'],
  ['official', 'Văn bản quản lí'],
  ['task', 'Nhiệm vụ'],
  ['event', 'Sự kiện lịch'],
  ['email', 'Email quan trọng'],
  ['thesis', 'Tài liệu luận văn'],
];

function AddMenu() {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const { openAdd } = useApp();
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="menu" ref={ref}>
      <button ref={btnRef} type="button" className="btn btn-primary" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <Icon name="plus" size={18} /> Thêm mới
      </button>
      {open && (
        <ul className="menu-pop menu-right" role="list">
          {ADD.map(([k, l]) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => {
                  btnRef.current?.focus(); // để hộp thoại trả focus về nút Thêm mới khi đóng
                  setOpen(false);
                  openAdd(k);
                }}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Header() {
  const { loc, navigate } = useRouter();
  const [q, setQ] = useState(loc.path === '/tim-kiem' ? loc.search.get('q') ?? '' : '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
  };
  const teachActive = TEACH.some(([p]) => loc.path.startsWith(p));
  const workActive = WORK.some(([p]) => loc.path.startsWith(p)) || loc.path.startsWith('/nhiem-vu');
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="Không gian làm việc Ngọc Mai – Tổng quan">
          <span className="brand-mark" aria-hidden="true">
            NM
          </span>
          <span className="brand-text">
            <strong>Ngọc Mai</strong>
            <small>Không gian làm việc</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <Link to="/" className={`nav-link${loc.path === '/' ? ' active' : ''}`} aria-current={loc.path === '/' ? 'page' : undefined}>
            Tổng quan
          </Link>
          <Menu label="Giảng dạy & chuyên môn" items={TEACH} tone="teal" active={teachActive} />
          <Menu label="Công việc & luận văn" items={WORK} tone="violet" active={workActive} />
        </nav>
        <form className="header-search" role="search" onSubmit={submit}>
          <label htmlFor="global-search" className="sr-only">
            Tìm kiếm tài liệu, nhiệm vụ, email
          </label>
          <Icon name="search" size={18} />
          <input id="global-search" type="search" placeholder="Tìm tên, số kí hiệu, nhãn…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <AddMenu />
      </div>
    </header>
  );
}
