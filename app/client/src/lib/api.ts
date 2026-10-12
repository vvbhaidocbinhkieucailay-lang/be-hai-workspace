// Gọi API cục bộ cùng origin. Mọi yêu cầu ghi kèm header X-Requested-With: NMW (máy chủ từ chối nếu thiếu).
import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Thư mục dự án (vd. D:\\2026-2027\\…\\NGOC-MAI-WORKSPACE) – nhớ lại để hướng dẫn khi mất kết nối. */
export function rememberRoot(root?: string) {
  try {
    if (root) localStorage.setItem('nmw_root', root);
  } catch {
    /* trình duyệt chặn bộ nhớ – không sao */
  }
}
function knownRoot(): string {
  try {
    return localStorage.getItem('nmw_root') ?? '';
  } catch {
    return '';
  }
}
function offlineMessage(extra = '') {
  const root = knownRoot();
  return (
    'Không kết nối được máy chủ cục bộ – máy chủ đang tắt (thường do cửa sổ máy chủ bị đóng). ' +
    `Mở lại: nháy đúp KHOI_DONG.bat trong thư mục ${root || 'dự án trên ổ D'}. Trang sẽ tự kết nối lại.` +
    (extra ? ` ${extra}` : '')
  );
}

async function parse(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* không phải JSON */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Lỗi ${res.status}`, data?.fields);
  return data;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(0, offlineMessage());
  }
  return parse(res);
}

export async function apiSend<T = any>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'NMW', Accept: 'application/json' },
      body: body === undefined ? '{}' : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, offlineMessage('Nội dung đã nhập vẫn được giữ, hãy bấm Lưu lại sau khi mở máy chủ.'));
  }
  return parse(res);
}

export const post = <T = any>(p: string, b?: unknown) => apiSend<T>('POST', p, b);
export const put = <T = any>(p: string, b?: unknown) => apiSend<T>('PUT', p, b);
export const del = <T = any>(p: string) => apiSend<T>('DELETE', p);

export async function uploadFile(docId: string, file: File, opts: { versionId?: string; versionLabel?: string; notes?: string; makeCurrent?: boolean }) {
  const q = new URLSearchParams();
  if (opts.versionId) q.set('version_id', opts.versionId);
  if (opts.versionLabel) q.set('version_label', opts.versionLabel);
  if (opts.notes) q.set('notes', opts.notes);
  if (opts.makeCurrent === false) q.set('make_current', '0');
  let res: Response;
  try {
    res = await fetch(`/api/documents/${docId}/upload?${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Requested-With': 'NMW', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
  } catch {
    throw new ApiError(0, offlineMessage('Chưa có tệp nào được lưu.'));
  }
  return parse(res);
}

/** Tải dữ liệu theo đường dẫn; tự tải lại khi `path` hoặc `refreshKey` đổi. */
export function useApi<T = any>(path: string | null, refreshKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    let retryTimer = 0;
    setLoading(true);
    apiGet<T>(path)
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: ApiError) => {
        if (!alive) return;
        setError(e.message);
        // Mất kết nối: tự thử lại sau 3 giây (khi cửa sổ máy chủ được mở lại)
        if (e.status === 0) retryTimer = window.setTimeout(() => alive && setTick((t) => t + 1), 3000);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      window.clearTimeout(retryTimer);
    };
  }, [path, refreshKey, tick]);
  return { data, error, loading, reload, setData };
}
