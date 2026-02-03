import { create } from 'zustand';

interface SoundState {
  isMuted: boolean;
  actions: {
    toggleMuted: () => void;
  };
}

export const useSoundStore = create<SoundState>((set) => ({
  isMuted: false,
  actions: {
    toggleMuted: () => set((state) => ({ isMuted: !state.isMuted })),
  },
}));
