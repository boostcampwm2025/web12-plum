import { create } from 'zustand';

import { PollFormValues } from '@/shared/constants/poll';
import { QnAFormValues } from '@/shared/constants/qna';

export interface PollWithId extends PollFormValues {
  id: string;
}

export interface QnAWithId extends QnAFormValues {
  id: string;
}

interface ActivityDataStore {
  polls: PollWithId[];
  qnas: QnAWithId[];

  actions: {
    appendPoll: (newPoll: PollFormValues) => void;
    updatePoll: (id: string, updatedPoll: PollFormValues) => void;
    removePoll: (id: string) => void;

    appendQna: (newQna: QnAFormValues) => void;
    updateQna: (id: string, updatedQna: QnAFormValues) => void;
    removeQna: (id: string) => void;

    reset: () => void;
  };
}

/**
 * 고유 ID 생성 함수
 */
const generateId = () => crypto.randomUUID();

const initialState = {
  polls: [] as PollWithId[],
  qnas: [] as QnAWithId[],
};

/**
 * 활동 데이터(투표/Q&A) 스토어
 *
 * 강의 생성 과정에서 발생하는 투표 및 Q&A 데이터를 전역 상태로 관리
 *
 * 1. 모달(ActivityModals)에서 제출 이벤트 발생 시 `append` 또는 `update` 액션 호출.
 * 2. `generateId`를 통해 각 항목에 불변의 고유 ID를 부여하여 상태 배열에 저장.
 * 3. 리스트 컴포넌트(ActivityList)는 업데이트된 `polls` 또는 `qnas` 배열을 구독하여 UI 갱신.
 * 4. 강의 생성 완료 또는 페이지 이탈 시 `reset` 액션을 호출하여 데이터 초기화.
 */
export const useActivityDataStore = create<ActivityDataStore>((set) => ({
  ...initialState,

  actions: {
    // 투표 추가
    appendPoll: (newPoll) =>
      set((state) => ({
        polls: [...state.polls, { ...newPoll, id: generateId() }],
      })),

    // 투표 수정
    updatePoll: (id, updatedPoll) =>
      set((state) => {
        const updatedPolls = state.polls.map((prevPoll) => {
          const isTarget = prevPoll.id === id;
          return isTarget ? { ...updatedPoll, id: prevPoll.id } : prevPoll;
        });
        return { polls: updatedPolls };
      }),

    // 투표 삭제
    removePoll: (id) =>
      set((state) => {
        const filteredPolls = state.polls.filter((poll) => poll.id !== id);
        return { polls: filteredPolls };
      }),

    // Q&A 추가
    appendQna: (newQna) =>
      set((state) => ({
        qnas: [...state.qnas, { ...newQna, id: generateId() }],
      })),

    // Q&A 수정
    updateQna: (id, updatedQna) =>
      set((state) => {
        const updatedQnas = state.qnas.map((prevQna) => {
          const isTarget = prevQna.id === id;
          return isTarget ? { ...updatedQna, id: prevQna.id } : prevQna;
        });
        return { qnas: updatedQnas };
      }),

    // Q&A 삭제
    removeQna: (id) =>
      set((state) => {
        const filteredQnas = state.qnas.filter((qna) => qna.id !== id);
        return { qnas: filteredQnas };
      }),

    // 스토어 초기화
    reset: () => set(initialState),
  },
}));
