import { create } from 'zustand';

interface MediaState {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  initialize: (mic: boolean, camera: boolean) => void;
}

const initialState: Pick<MediaState, 'isMicOn' | 'isCameraOn' | 'isScreenSharing'> = {
  isMicOn: false,
  isCameraOn: false,
  isScreenSharing: false,
};

export const useMediaStore = create<MediaState>((set) => ({
  ...initialState,
  toggleMic: () => set((state) => ({ isMicOn: !state.isMicOn })),
  toggleCamera: () => set((state) => ({ isCameraOn: !state.isCameraOn })),
  toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
  initialize: (mic, camera) => set({ isMicOn: mic, isCameraOn: camera, isScreenSharing: false }),
}));
