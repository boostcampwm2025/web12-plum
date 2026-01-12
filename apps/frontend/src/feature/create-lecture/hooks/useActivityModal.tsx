import { createContext, useContext, ReactNode, useMemo, useState } from 'react';

export type ActivityModalState =
  | { type: 'none' }
  | { type: 'create-poll' }
  | { type: 'create-qna' }
  | { type: 'edit-poll'; index: number }
  | { type: 'edit-qna'; index: number };

interface ActivityModalContextValue {
  modalState: ActivityModalState;
  openCreatePollModal: () => void;
  openCreateQnaModal: () => void;
  openEditPollModal: (index: number) => void;
  openEditQnaModal: (index: number) => void;
  closeModal: () => void;
}

/**
 * 활동 모달 상태 관리 컨텍스트
 */
const ActivityModalContext = createContext<ActivityModalContextValue | null>(null);

/**
 * 활동 모달 상태 관리 Provider 컴포넌트
 * @param children 자식 컴포넌트들
 * @returns 활동 모달 상태 관리 Provider JSX 요소
 */
export function ActivityModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ActivityModalState>({ type: 'none' });

  const value = useMemo(
    () => ({
      modalState,
      openCreatePollModal: () => setModalState({ type: 'create-poll' }),
      openCreateQnaModal: () => setModalState({ type: 'create-qna' }),
      openEditPollModal: (index: number) => setModalState({ type: 'edit-poll', index }),
      openEditQnaModal: (index: number) => setModalState({ type: 'edit-qna', index }),
      closeModal: () => setModalState({ type: 'none' }),
    }),
    [modalState],
  );

  return <ActivityModalContext.Provider value={value}>{children}</ActivityModalContext.Provider>;
}

/**
 * 활동 모달 및 제어 함수들 사용 훅
 * @returns 활동 모달 상태 및 제어 함수들
 */
export const useActivityModal = () => {
  const context = useContext(ActivityModalContext);
  if (!context) {
    throw new Error('useActivityModal은 ActivityModalProvider 내에서 사용되어야 합니다');
  }

  return context;
};
