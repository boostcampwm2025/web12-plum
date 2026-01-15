import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MediaState {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  hasHydrated: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  initialize: (mic: boolean, camera: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const initialState: Pick<MediaState, 'isMicOn' | 'isCameraOn' | 'isScreenSharing' | 'hasHydrated'> =
  {
    isMicOn: false,
    isCameraOn: false,
    isScreenSharing: false,
    hasHydrated: false,
  };

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      ...initialState,
      toggleMic: () => set((state) => ({ isMicOn: !state.isMicOn })),
      toggleCamera: () => set((state) => ({ isCameraOn: !state.isCameraOn })),
      toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
      initialize: (mic, camera) =>
        set({ isMicOn: mic, isCameraOn: camera, isScreenSharing: false }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'room-media',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        isMicOn: state.isMicOn,
        isCameraOn: state.isCameraOn,
        isScreenSharing: state.isScreenSharing,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
