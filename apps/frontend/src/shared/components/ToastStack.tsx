import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/shared/components/icon/Icon';
import type { IconName } from '@/shared/components/icon/iconMap';
import { TOAST_TTL_MS, type ToastType, useToastStore } from '@/store/useToastStore';

declare global {
  interface Window {
    __toastTest?: (type: ToastType, title: string, count?: number, intervalMs?: number) => void;
  }
}

const TOAST_ICON_MAP: Record<ToastType, IconName> = {
  info: 'toast-info',
  success: 'toast-check',
  error: 'toast-exclamation',
  gesture: 'toast-gesture',
};

const TOAST_ACCENT_CLASS: Record<ToastType, string> = {
  info: 'text-primary',
  success: 'text-success',
  error: 'text-error',
  gesture: 'text-primary',
};

export function ToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.actions.removeToast);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timersRef.current.has(toast.id)) {
        return;
      }

      const elapsed = Date.now() - toast.createdAt;
      const remaining = Math.max(0, TOAST_TTL_MS - elapsed);

      const timerId = window.setTimeout(() => {
        removeToast(toast.id);
        timersRef.current.delete(toast.id);
      }, remaining);

      timersRef.current.set(toast.id, timerId);
    });

    timersRef.current.forEach((timerId, toastId) => {
      if (!toasts.some((toast) => toast.id === toastId)) {
        window.clearTimeout(timerId);
        timersRef.current.delete(toastId);
      }
    });
  }, [toasts, removeToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    window.__toastTest = (type, title, count = 1, intervalMs = 200) => {
      const total = Math.max(1, count);
      const interval = Math.max(0, intervalMs);
      for (let i = 0; i < total; i += 1) {
        window.setTimeout(() => {
          useToastStore.getState().actions.addToast({ type, title });
        }, i * interval);
      }
    };

    return () => {
      delete window.__toastTest;
    };
  }, []);

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-50 flex max-w-72 flex-col gap-2">
      <AnimatePresence
        initial={false}
        mode="popLayout"
      >
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{
              layout: { duration: 0.2, ease: 'easeInOut' },
              opacity: { duration: 0.15 },
              scale: { duration: 0.15 },
            }}
            className="flex items-center gap-3 rounded-lg bg-gray-500/80 px-3 py-2 text-white shadow-md backdrop-blur"
          >
            <Icon
              name={TOAST_ICON_MAP[toast.type]}
              size={24}
              className={`${TOAST_ACCENT_CLASS[toast.type]} fill-current`}
              decorative
            />
            <span className="truncate text-xs font-bold tracking-tight">{toast.title}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
