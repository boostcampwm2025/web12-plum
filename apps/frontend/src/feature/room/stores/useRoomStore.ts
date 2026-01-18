import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ParticipantRole } from '@plum/shared-interfaces';
import { RtpCapabilities } from 'mediasoup-client/types';

interface MyInfo {
  id: string;
  name: string;
  role: ParticipantRole;
}

interface RoomActions {
  setMyInfo: (info: MyInfo) => void;
  setRouterRtpCapabilities: (capabilities: RtpCapabilities) => void;
  reset: () => void;
}

interface RoomState {
  // 내 정보
  myInfo: MyInfo | null;
  routerRtpCapabilities: RtpCapabilities | null;
  actions: RoomActions;
}

const initialState: Omit<RoomState, 'actions'> = {
  myInfo: null,
  routerRtpCapabilities: null,
};

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        setMyInfo: (info) => set({ myInfo: info }),
        setRouterRtpCapabilities: (capabilities) => set({ routerRtpCapabilities: capabilities }),

        reset: () => set({ ...initialState }),
      },
    }),
    {
      name: 'room-my-info',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        myInfo: state.myInfo,
        routerRtpCapabilities: state.routerRtpCapabilities,
      }),
    },
  ),
);
