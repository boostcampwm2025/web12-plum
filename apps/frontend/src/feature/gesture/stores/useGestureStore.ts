import { create } from 'zustand';
import type { GestureType } from '@plum/shared-interfaces';

export interface GestureProgress {
  gesture: GestureType | null;
  progress: number;
}

interface GestureStoreState {
  gestureProgress: GestureProgress;
  actions: {
    setGestureProgress: (progress: GestureProgress) => void;
    resetGestureProgress: () => void;
  };
}

const initialProgress: GestureProgress = {
  gesture: null,
  progress: 0,
};

export const useGestureStore = create<GestureStoreState>((set) => ({
  gestureProgress: initialProgress,
  actions: {
    setGestureProgress: (progress) =>
      set((state) => {
        const current = state.gestureProgress;
        if (current.gesture === progress.gesture && current.progress === progress.progress) {
          return state;
        }
        return { gestureProgress: progress };
      }),
    resetGestureProgress: () => set({ gestureProgress: initialProgress }),
  },
}));
