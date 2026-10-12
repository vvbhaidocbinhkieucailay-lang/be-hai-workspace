// Thành phần giao diện dùng chung: biểu tượng, hộp thoại có quản lí focus, nhãn trạng thái, trạng thái rỗng/lỗi/đang tải, trường biểu mẫu.
import { useEffect, useId, useRef, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const PATHS: Record<string, string> = {
  cap: 'M12 3 1 9l11 6 9-4.9V17h2V9L12 3zm-6 9.2V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.8l-6 3.3-6-3.3z',
  book: 'M6 2h11a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 15a1 1 0 0 0 0 2h11v-2H6zm2-11v2h7V6H8zm0 4v2h7v-2H8z',
  flask: 'M9 2h6v2h-1v5.3l5.6 9.7A2 2 0 0 1 17.9 22H6.1a2 2 0 0 1-1.7-3l5.6-9.7V4H9V2zm3 9-2.9 5h5.8L12 11z',
  stamp: 'M4 4h16v4H4V4zm2 6h12v10H6V10zm2 2v2h8v-2H8zm0 4v2h5v-2H8z',
  calendar: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zM5 9v10h14V9H5zm2 2h4v4H7v-4z',
  mail: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.5 7v1.8L12 14l7.5-5.2V7L12 12.2z',
  thesis: 'M5 2h10l5 5v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm9 1.5V8h4.5L14 3.5zM7 12v2h10v-2H7zm0 4v2h7v-2H7z',
  briefcase: 'M9 3h6a2 2 0 0 1 2 2v1h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4V5a2 2 0 0 1 2-2zm0 3h6V5H9v1zm-5 5v7h16v-7h-6v2h-4v-2H4z',
  search: 'M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z',
  pin: 'M14 2l8 8-2 1-3-1-4 4 1 5-1 1-5-5-5 5-1-1 5-5-5-5 1-1 5 1 4-4-1-3 1-2z',
  arrow: 'M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  chevron: 'M7 10l5 5 5-5H7z',
  file: 'M6 2h8l6 6v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V9h5.5L13 3.5z',
  download: 'M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6V3zM4 18h16v2H4v-2z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z',
};

export function Icon({ name, size = 20, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name] ?? PATHS.file} fill="currentColor" />
    </svg>
  );
}

/** Hộp thoại: focus vào phần tử đầu, giữ Tab trong hộp, Esc để đóng, trả focus về chỗ cũ. */
export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const first = el.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button:not(.dialog-x)');
    (first ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const items = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
        if (!items.length) return;
        const a = items[0];
        const z = items[items.length - 1];
        if (!el.contains(document.activeElement)) {
          e.preventDefault();
          a.focus();
        } else if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    // Lắng nghe ở document: vẫn đóng được bằng Esc khi focus tạm rơi ra ngoài (vd. nút Lưu bị vô hiệu lúc đang lưu)
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      if (prev && prev.isConnected) prev.focus();
      else document.getElementById('main')?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`dialog${wide ? ' dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn dialog-x" onClick={onClose} aria-label="Đóng hộp thoại">
            <Icon name="close" />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral', title }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'violet' | 'warn' | 'danger' | 'ok' | 'demo'; title?: string }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <p className="state state-loading" role="status">
      <span className="spinner" aria-hidden="true" /> {label}
    </p>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <strong>Lỗi:</strong> {message}
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

type FieldProps = { label: string; error?: string; hint?: string; required?: boolean };

export function Field({ label, error, hint, required, children, id }: FieldProps & { children: ReactNode; id: string }) {
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> (bắt buộc)</span>}
      </label>
      {children}
      {hint && !error && <small className="hint" id={`${id}-hint`}>{hint}</small>}
      {error && <small className="err" id={`${id}-err`}>{error}</small>}
    </div>
  );
}

export function TextInput({ label, error, hint, required, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} required={required} {...rest} />
    </Field>
  );
}

export function TextArea({ label, error, hint, required, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <textarea id={id} aria-invalid={!!error} rows={3} {...rest} />
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  options,
  empty = '— Chưa chọn —',
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][]; empty?: string | null }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <select id={id} aria-invalid={!!error} {...rest}>
        {empty !== null && <option value="">{empty}</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({ label, ...rest }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="check">
      <input type="checkbox" id={id} {...rest} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

/** Thông báo lỗi cho biểu mẫu – nội dung đã nhập vẫn giữ nguyên. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {message} <span className="muted">Nội dung đã nhập vẫn được giữ.</span>
    </div>
  );
}
