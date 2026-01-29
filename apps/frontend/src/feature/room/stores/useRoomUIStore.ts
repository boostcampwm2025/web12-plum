import { create } from 'zustand';
import type { EndPollPayload } from '@plum/shared-interfaces';

export type Dialog = 'vote' | 'qna' | 'ranking';
export type SidePanel = 'chat' | 'info' | 'menu';

interface RoomUIState {
  activeDialog: Dialog | null;
  activeSidePanel: SidePanel | null;
  pollResult: EndPollPayload | null;
  setActiveDialog: (dialog: Dialog) => void;
  setActiveSidePanel: (panel: SidePanel) => void;
  setPollResult: (result: EndPollPayload | null) => void;
}

const initialState: Pick<RoomUIState, 'activeDialog' | 'activeSidePanel' | 'pollResult'> = {
  activeDialog: null,
  activeSidePanel: null,
  pollResult: null,
};

export const useRoomUIStore = create<RoomUIState>((set) => ({
  ...initialState,
  setActiveDialog: (dialog) =>
    set((state) => ({
      activeDialog: state.activeDialog === dialog ? null : dialog,
    })),
  setActiveSidePanel: (panel) =>
    set((state) => ({
      activeSidePanel: state.activeSidePanel === panel ? null : panel,
    })),
  setPollResult: (result) => set({ pollResult: result }),
}));
