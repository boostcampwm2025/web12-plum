import type { RoomSummary } from '@plum/shared-interfaces';
import { create } from 'zustand';

interface SummaryStoreState {
  summaryData: RoomSummary | null;
  actions: {
    setSummaryData: (data: RoomSummary) => void;
    clearSummaryData: () => void;
  };
}

/**
 * 강의 종료 후 생성된 요약 리포트 데이터를 관리
 */
export const useSummaryStore = create<SummaryStoreState>((set) => ({
  summaryData: null,
  actions: {
    /**
     * 전체 요약 데이터를 스토어에 할당
     * Polling을 통해 데이터가 업데이트될 때도 호출되어 UI 동기화 유도
     */
    setSummaryData: (data) => set({ summaryData: data }),

    /**
     * 스토어 데이터를 초기화합
     * 다른 페이지로 이동할 때, 명시적으로 호출
     */
    clearSummaryData: () => set({ summaryData: null }),
  },
}));
