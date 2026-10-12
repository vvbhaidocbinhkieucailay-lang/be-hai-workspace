// Bộ định tuyến nhỏ dùng History API (không thêm thư viện). URL chi tiết dùng ID ổn định nên mở lại/refresh được.
import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

type Loc = { path: string; search: URLSearchParams };
const RouterCtx = createContext<{ loc: Loc; navigate: (to: string, opts?: { replace?: boolean }) => void }>({
  loc: { path: '/', search: new URLSearchParams() },
  navigate: () => {},
});

function current(): Loc {
  return { path: decodeURI(window.location.pathname) || '/', search: new URLSearchParams(window.location.search) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Loc>(current);
  useEffect(() => {
    const on = () => setLoc(current());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const navigate = (to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    setLoc(current());
    if (!to.includes('#')) window.scrollTo({ top: 0 });
  };
  return <RouterCtx.Provider value={{ loc, navigate }}>{children}</RouterCtx.Provider>;
}

export const useRouter = () => useContext(RouterCtx);

export function Link({ to, children, onClick, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/** So khớp mẫu '/tai-lieu/:id' với đường dẫn; trả về tham số hoặc null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = b[i];
    else if (a[i] !== b[i]) return null;
  }
  return out;
}
