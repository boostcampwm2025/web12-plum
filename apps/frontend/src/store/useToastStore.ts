import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error' | 'gesture';

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  createdAt: number;
};

export const TOAST_TTL_MS = 2500;
export const TOAST_MAX = 5;

interface ToastStoreState {
  toasts: Toast[];
  actions: {
    addToast: (input: Omit<Toast, 'id' | 'createdAt'>) => string;
    removeToast: (id: string) => void;
  };
}

const buildToastId = (timestamp: number) =>
  `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  actions: {
    addToast: (input) => {
      const createdAt = Date.now();
      const toast: Toast = {
        id: buildToastId(createdAt),
        createdAt,
        ...input,
      };
      set((state) => {
        const next = [...state.toasts, toast];
        return { toasts: next.slice(-TOAST_MAX) };
      });
      return toast.id;
    },
    removeToast: (id) =>
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  },
}));
