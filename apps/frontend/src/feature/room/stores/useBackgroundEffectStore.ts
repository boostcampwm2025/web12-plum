import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type BackgroundEffectMode = 'blur' | 'image' | 'off';

interface BackgroundEffectState {
  mode: BackgroundEffectMode;
  processedStream: MediaStream | null;
  actions: {
    setMode: (mode: BackgroundEffectMode) => void;
    setProcessedStream: (stream: MediaStream | null) => void;
  };
}

export const useBackgroundEffectStore = create<BackgroundEffectState>()(
  persist(
    (set) => ({
      mode: 'blur',
      processedStream: null,
      actions: {
        setMode: (mode) => set({ mode }),
        setProcessedStream: (stream) => set({ processedStream: stream }),
      },
    }),
    {
      name: 'background-effect',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
