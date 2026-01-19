import { MediaType } from '@plum/shared-interfaces';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface RemoteStream {
  participantId: string;
  stream: MediaStream;
  type: MediaType;
  consumerId: string;
}

interface MediaActions {
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  initialize: (mic: boolean, camera: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

interface MediaState {
  // 로컬 미디어 UI 상태
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  hasHydrated: boolean;

  // 원격 스트림
  remoteStreams: Map<string, RemoteStream>; // consumerId -> RemoteStream

  // 액션
  actions: MediaActions;
}

const initialState: Omit<MediaState, 'actions'> = {
  isMicOn: false,
  isCameraOn: false,
  isScreenSharing: false,
  hasHydrated: false,
  remoteStreams: new Map(),
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: {
        toggleMic: () => set((state) => ({ isMicOn: !state.isMicOn })),
        toggleCamera: () => set((state) => ({ isCameraOn: !state.isCameraOn })),
        toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
        initialize: (mic, camera) =>
          set({ isMicOn: mic, isCameraOn: camera, isScreenSharing: false }),
        setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

        /** 원격 스트림을 추가 */
        addRemoteStream: (consumerId: string, stream: RemoteStream) => {
          set((state) => {
            const newStreams = new Map(state.remoteStreams);
            newStreams.set(consumerId, stream);
            return { remoteStreams: newStreams };
          });
        },

        /** 원격 스트림을 제거 */
        removeRemoteStream: (consumerId: string) => {
          set((state) => {
            const stream = state.remoteStreams.get(consumerId);
            if (stream) {
              stream.stream.getTracks().forEach((track) => track.stop());
            }

            const newStreams = new Map(state.remoteStreams);
            newStreams.delete(consumerId);
            return { remoteStreams: newStreams };
          });
        },

        /**
         * 특정 참가자의 원격 스트림을 가져옴
         * 마이크 켜짐/꺼짐 상태 표시용
         */
        getRemoteStreamsByParticipant: (participantId: string) => {
          const streams = get().remoteStreams;
          const filteredStreams = Array.from(streams.values()).filter(
            (stream) => stream.participantId === participantId,
          );
          return filteredStreams;
        },

        /**
         * consumerId로 원격 스트림을 가져옴
         * 특정 스트림의 상태 확인용
         */
        getRemoteStream: (consumerId: string) => {
          const stream = get().remoteStreams.get(consumerId);
          return stream;
        },

        /** 모든 원격 스트림을 초기화하고 정리 */
        resetRemoteStreams: () => {
          get().remoteStreams.forEach((stream) => {
            stream.stream.getTracks().forEach((track) => track.stop());
          });
          set({ remoteStreams: new Map() });
        },
      },
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
        state?.actions.setHasHydrated(true);
      },
    },
  ),
);
