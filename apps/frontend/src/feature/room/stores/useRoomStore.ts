import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ParticipantRole } from '@plum/shared-interfaces';

interface MyInfo {
  id: string;
  name: string;
  role: ParticipantRole;
}

interface RoomState {
  myInfo: MyInfo | null;
  actions: {
    setMyInfo: (info: MyInfo) => void;
    reset: () => void;
  };
}

const initialState: Pick<RoomState, 'myInfo'> = {
  myInfo: null,
};

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        setMyInfo: (info) => set({ myInfo: info }),
        reset: () => set({ ...initialState }),
      },
    }),
    {
      name: 'room-my-info',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        myInfo: state.myInfo,
      }),
    },
  ),
);
