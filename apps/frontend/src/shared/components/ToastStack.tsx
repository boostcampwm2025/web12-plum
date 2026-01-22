import { forwardRef, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/shared/components/icon/Icon';
import type { IconName } from '@/shared/components/icon/iconMap';
import { cn } from '@/shared/lib/utils';
import { TOAST_TTL_MS, type Toast, type ToastType, useToastStore } from '@/store/useToastStore';
import { GESTURE_BG_CLASS, GESTURE_ICON_MAP } from '../constants/gesture';

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

const ToastItem = forwardRef<HTMLDivElement, { toast: Toast }>(({ toast }, ref) => {
  const isGestureToast = toast.type === 'gesture';
  const gesture = toast.gesture;
  const iconName: IconName =
    isGestureToast && gesture ? GESTURE_ICON_MAP[gesture] : TOAST_ICON_MAP[toast.type];
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{
        layout: { duration: 0.2, ease: 'easeInOut' },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-white shadow-md backdrop-blur',
        isGestureToast && gesture ? GESTURE_BG_CLASS[gesture] : 'bg-gray-500/80',
      )}
    >
      <Icon
        name={iconName}
        size={24}
        className={cn(
          'fill-current',
          isGestureToast ? 'text-text' : TOAST_ACCENT_CLASS[toast.type],
        )}
        decorative
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs font-bold tracking-tight">{toast.title}</span>
        {toast.description && <span className="text-[10px] font-light">{toast.description}</span>}
      </div>
    </motion.div>
  );
});

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

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-50 flex max-w-72 flex-col gap-2">
      <AnimatePresence
        initial={false}
        mode="popLayout"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
