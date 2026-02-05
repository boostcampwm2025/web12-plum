import { create } from 'zustand';
import type { RoomSummary, Timelines } from '@plum/shared-interfaces';

interface SummaryStoreState {
  summaryData: RoomSummary | null;
  actions: {
    setSummaryData: (data: RoomSummary) => void;
    clearSummaryData: () => void;
  };
}

/**
 * 첫 번째 타임라인 시작 시점을 기준(0초)으로 상대 시간 계산된 timelines 반환
 * UI 표시용으로 '강의 시작 후 경과 시간' 형태로 가공
 */
export const selectRelativeTimelines = (state: SummaryStoreState): Timelines[] => {
  const timelines = state.summaryData?.timelines ?? [];
  if (timelines.length === 0) return [];

  const baseTime = timelines[0].startedAt;
  const relativeTimelines = timelines.map((t) => ({
    ...t,
    startedAt: t.startedAt - baseTime,
    endedAt: t.endedAt - baseTime,
  }));

  return relativeTimelines;
};

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
