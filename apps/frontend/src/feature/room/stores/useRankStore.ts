import { create } from 'zustand';
import type {
  RankItem,
  RankUpdatePayload,
  PresenterScoreInfoPayload,
  ScoreUpdatePayload,
} from '@plum/shared-interfaces';

interface RankState {
  top: RankItem[];
  lowest: RankItem | null;
  myScore: number;
  actions: {
    updateRank: (data: RankUpdatePayload) => void;
    updatePresenterRank: (data: PresenterScoreInfoPayload) => void;
    updateMyScore: (data: ScoreUpdatePayload) => void;
    initializeRank: (data: { top: RankItem[]; lowest?: RankItem | null; score?: number }) => void;
  };
}

export const useRankStore = create<RankState>((set) => ({
  top: [],
  lowest: null,
  myScore: 0,
  actions: {
    updateRank: (data) => {
      set({ top: data.top });
    },
    updatePresenterRank: (data) => {
      set({ top: data.top, lowest: data.lowest });
    },
    updateMyScore: (data) => {
      set({ myScore: data.score });
    },
    initializeRank: (data) => {
      set({
        top: data.top,
        lowest: data.lowest ?? null,
        myScore: data.score ?? 0,
      });
    },
  },
}));
