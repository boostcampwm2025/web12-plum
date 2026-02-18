import { create } from 'zustand';

interface SoundState {
  isSoundEnabled: boolean;
  actions: {
    toggleSoundEnabled: () => void;
  };
}

export const useSoundStore = create<SoundState>((set) => ({
  isSoundEnabled: true,
  actions: {
    toggleSoundEnabled: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
  },
}));
