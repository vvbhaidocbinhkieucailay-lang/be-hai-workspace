// Khung ứng dụng: header, định tuyến, hộp thoại "Thêm mới" dùng chung, thông báo, chân trang.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, rememberRoot } from './lib/api';
import { AppContext, type AddKind } from './lib/appContext';
import { Link, match, useRouter } from './lib/router';
import { Header } from './components/Header';
import { Dialog } from './components/ui';
import { DocumentForm, EmailForm, EventForm, TaskForm } from './features/forms';
import { Home } from './pages/Home';
import { DocumentsPage } from './pages/Documents';
import { DocumentDetail } from './pages/DocumentDetail';
import { CalendarPage } from './pages/Calendar';
import { EmailsPage } from './pages/Emails';
import { ThesisPage } from './pages/Thesis';
import { EmailRedirect, GuidePage, NotFound, SearchPage, SettingsPage, TaskDetail } from './pages/Misc';

const ADD_TITLES: Record<AddKind, string> = {
  lesson: 'Thêm kế hoạch bài dạy',
  material: 'Thêm tài liệu chuyên môn',
  official: 'Thêm văn bản quản lí',
  thesis: 'Thêm tài liệu luận văn',
  task: 'Thêm nhiệm vụ',
  event: 'Thêm sự kiện lịch',
  email: 'Thêm email quan trọng',
};

const TITLES: [string, string][] = [
  ['/ke-hoach-bai-day', 'Kế hoạch bài dạy'],
  ['/chuyen-mon', 'Tài liệu chuyên môn'],
  ['/van-ban', 'Văn bản quản lí'],
  ['/lich-cong-viec', 'Lịch & nhiệm vụ'],
  ['/email-quan-trong', 'Email quan trọng'],
  ['/luan-van', 'Hồ sơ luận văn'],
  ['/cai-dat', 'Quản lí dữ liệu'],
  ['/tim-kiem', 'Tìm kiếm'],
  ['/huong-dan', 'Hướng dẫn'],
];

function Routes() {
  const { loc } = useRouter();
  const p = loc.path.replace(/\/+$/, '') || '/';
  let m;
  if (p === '/') return <Home />;
  if (p === '/ke-hoach-bai-day') return <DocumentsPage key="lesson" kind="lesson" />;
  if (p === '/chuyen-mon') return <DocumentsPage key="material" kind="material" />;
  if (p === '/van-ban') return <DocumentsPage key="official" kind="official" />;
  if (p === '/lich-cong-viec') return <CalendarPage />;
  if (p === '/email-quan-trong') return <EmailsPage />;
  if (p === '/luan-van') return <ThesisPage />;
  if (p === '/cai-dat') return <SettingsPage />;
  if (p === '/tim-kiem') return <SearchPage />;
  if (p === '/huong-dan') return <GuidePage />;
  if ((m = match('/tai-lieu/:id', p))) return <DocumentDetail key={m.id} id={m.id} />;
  if ((m = match('/nhiem-vu/:id', p))) return <TaskDetail key={m.id} id={m.id} />;
  if ((m = match('/email-quan-trong/:id', p))) return <EmailRedirect key={m.id} id={m.id} />;
  return <NotFound />;
}

export function App() {
  const { loc, navigate } = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: 'ok' | 'error'; n: number } | null>(null);
  const [add, setAdd] = useState<{ kind: AddKind; preset?: Record<string, any> } | null>(null);
  const [mode, setMode] = useState<'real' | 'demo'>('real');
  const timer = useRef<number>(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    setToastMsg({ msg, kind, n: Date.now() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMsg(null), kind === 'error' ? 8000 : 4000);
  }, []);
  const openAdd = useCallback((kind: AddKind, preset?: Record<string, any>) => setAdd({ kind, preset }), []);
  const changeMode = useCallback((m: 'real' | 'demo') => {
    setMode(m);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    apiGet('/api/system/info').then((i) => { setMode(i.mode); rememberRoot(i.root_abs); }).catch(() => {});
  }, []);
  const firstRender = useRef(true);
  useEffect(() => {
    const p = loc.path;
    const t = TITLES.find(([k]) => p.startsWith(k))?.[1];
    document.title = `${t ? `${t} – ` : ''}Không gian làm việc Bé Hai`;
    // Chuyển trang: đưa focus về nội dung chính (không làm ở lần tải đầu để Tab đầu tiên vào link “Bỏ qua”)
    if (firstRender.current) firstRender.current = false;
    else document.getElementById('main')?.focus({ preventScroll: true });
  }, [loc.path]);

  const done = (msg: string, to?: string) => {
    setAdd(null);
    toast(msg);
    bump();
    if (to) navigate(to);
  };

  return (
    <AppContext.Provider value={{ refreshKey, bump, toast, openAdd, mode, setMode: changeMode }}>
      <a href="#main" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>
      {mode === 'demo' && (
        <div className="demo-banner" role="status">
          ĐANG XEM DỮ LIỆU MINH HỌA – tách riêng khỏi dữ liệu thật. <Link to="/cai-dat">Thoát minh họa</Link>
        </div>
      )}
      <Header />
      <main id="main" tabIndex={-1} className="main">
        <Routes />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>Không gian làm việc Bé Hai · V1 chạy cục bộ trên máy này</span>
          <nav aria-label="Chân trang">
            <Link to="/huong-dan">Hướng dẫn</Link>
            <Link to="/cai-dat">Quản lí dữ liệu &amp; sao lưu</Link>
            <Link to="/cai-dat#luu-tru">Mục đã lưu trữ</Link>
          </nav>
        </div>
      </footer>
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toastMsg && (
          <div key={toastMsg.n} className={`toast toast-${toastMsg.kind}`} role={toastMsg.kind === 'error' ? 'alert' : 'status'}>
            {toastMsg.kind === 'error' ? 'Lỗi: ' : '✓ '}
            {toastMsg.msg}
          </div>
        )}
      </div>
      {add && (
        <Dialog title={ADD_TITLES[add.kind]} onClose={() => setAdd(null)} wide>
          {['lesson', 'material', 'official', 'thesis'].includes(add.kind) && (
            <DocumentForm category={add.kind} preset={add.preset} onCancel={() => setAdd(null)} onDone={(d) => done('Đã lưu tài liệu', `/tai-lieu/${d.id}`)} />
          )}
          {add.kind === 'task' && (
            <TaskForm
              preset={add.preset}
              onCancel={() => setAdd(null)}
              onDone={() => done('Đã lưu nhiệm vụ')}
            />
          )}
          {add.kind === 'event' && <EventForm preset={add.preset} onCancel={() => setAdd(null)} onDone={() => done('Đã lưu sự kiện')} />}
          {add.kind === 'email' && <EmailForm onCancel={() => setAdd(null)} onDone={() => done('Đã lưu email')} />}
        </Dialog>
      )}
    </AppContext.Provider>
  );
}
