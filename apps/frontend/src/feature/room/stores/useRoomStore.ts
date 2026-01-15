import { create } from 'zustand';
import type { ParticipantRole } from '@plum/shared-interfaces';

interface MyInfo {
  participantId: string;
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

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,
  actions: {
    setMyInfo: (info) => set({ myInfo: info }),
    reset: () => set({ ...initialState }),
  },
}));
