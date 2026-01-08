import { create } from 'zustand';

export type Dialog = 'vote' | 'qna' | 'ranking';
export type SidePanel = 'chat' | 'info' | 'menu';

interface RoomUIState {
  activeDialog: Dialog | null;
  activeSidePanel: SidePanel | null;
  setActiveDialog: (dialog: Dialog) => void;
  setActiveSidePanel: (panel: SidePanel) => void;
}

const initialState: Pick<RoomUIState, 'activeDialog' | 'activeSidePanel'> = {
  activeDialog: null,
  activeSidePanel: null,
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
}));
