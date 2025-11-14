'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export type ToastOptions = {
  id?: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number; // ms; set to 0 to disable auto-dismiss
};

export type ToastInstance = Required<Pick<ToastOptions, 'id'>> &
  Omit<ToastOptions, 'id'> & {
    createdAt: number;
  };

type ToastContextValue = {
  toasts: ToastInstance[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-slate-700 bg-slate-900/90 text-slate-100',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
  error: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
  warning: 'border-amber-400/40 bg-amber-400/15 text-amber-100'
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleDismissal = useCallback(
    (toast: ToastInstance) => {
      if (toast.duration && toast.duration > 0) {
        const timerId = window.setTimeout(() => dismissToast(toast.id), toast.duration);
        timersRef.current.set(toast.id, timerId);
      }
    },
    [dismissToast]
  );

  const showToast = useCallback(
    ({ id, title, description, variant = 'default', duration }: ToastOptions) => {
      const toastId = id ?? crypto.randomUUID();
      setToasts((current) => {
        const next: ToastInstance = {
          id: toastId,
          title,
          description,
          variant,
          duration: duration ?? DEFAULT_DURATION,
          createdAt: Date.now()
        };
        return [...current.filter((toast) => toast.id !== toastId), next];
      });
      return toastId;
    },
    []
  );

  useEffect(() => {
    const latest = toasts[toasts.length - 1];
    if (latest) {
      scheduleDismissal(latest);
    }
  }, [scheduleDismissal, toasts]);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, showToast, dismissToast, clearToasts }),
    [dismissToast, showToast, toasts, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isMounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6">
            {toasts
              .slice()
              .reverse()
              .map((toast) => (
                <div
                  key={toast.id}
                  className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-lg shadow-black/40 backdrop-blur ${variantStyles[toast.variant] ?? variantStyles.default}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {toast.title && <p className="text-sm font-semibold leading-tight">{toast.title}</p>}
                      <p className="mt-0.5 text-sm leading-snug text-slate-200/90">{toast.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissToast(toast.id)}
                      className="-mr-1 -mt-1 rounded-full p-1 text-xs text-slate-400 transition hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
