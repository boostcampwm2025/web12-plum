import { create } from 'zustand';

export type ActivityModalState =
  | { type: 'none' }
  | { type: 'create-poll' }
  | { type: 'create-qna' }
  | { type: 'edit-poll'; id: string }
  | { type: 'edit-qna'; id: string };

/**
 * open: 모달 열기 액션
 * close: 모달 닫기 액션
 */
interface Actions {
  open: (modalState: ActivityModalState) => void;
  close: () => void;
}

/**
 * modalState: 현재 모달 상태
 */
interface ActivityModalStore {
  modalState: ActivityModalState;
  actions: Actions;
}

/**
 * 활동 모달 상태 관리 스토어
 *
 * 강의실 내에서 사용하는 투표(Poll), 질문(Q&A) 생성 및 수정 모달의 전역 상태를 관리
 * 상태(type)에 따라 렌더링할 모달의 종류와 수정 시 필요한 데이터(id)를 제어
 *
 * 1. UI 컴포넌트에서 `actions.open`을 호출하며 원하는 모달 타입과 페이로드(id 등)를 전달.
 * 2. 스토어의 `modalState` 상태가 업데이트되며 이를 구독 중인 모달 컨테이너가 특정 모달을 렌더링.
 * 3. 모달 내부 작업이 완료되거나 닫기 버튼 클릭 시 `actions.close`를 호출하여 상태를 'none'으로 리셋.
 */
export const useActivityModalStore = create<ActivityModalStore>((set) => ({
  modalState: { type: 'none' },
  actions: {
    open: (modalState) => set({ modalState }),
    close: () => set({ modalState: { type: 'none' } }),
  },
}));
