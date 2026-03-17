import { useCallback } from 'react';

import { PollModal } from '@/shared/components/PollModal';
import { QnAModal } from '@/shared/components/QnAModal';
import { PollFormValues } from '@/shared/constants/poll';
import { QnAFormValues } from '@/shared/constants/qna';

import { useActivityDataStore } from '../stores/useActivityDataStore';
import { useActivityModalStore } from '../stores/useActivityModalStore';

/**
 * 투표 모달 컴포넌트
 *
 * 강의실 내 투표 생성 및 수정을 담당하는 모달 컴포넌트
 * 스토어의 `modalState`에 따라 적절한 모달을 렌더링하고, 사용자 입력 데이터를 폼 상태에 반영
 *
 * 1. `useActivityModalStore`를 통해 현재 열려야 할 모달의 타입과 데이터 인덱스를 감지.
 * 2. `useActivityDataStore`로부터 활동 데이터(polls)와 조작 액션(`append`, `update`)을 가져옴.
 * 3. 제출 발생 시, 현재 모달의 상태(`create` 또는 `edit`)를 판별하여 해당되는 폼 액션 실행.
 * 4. 데이터 반영 후 `closeModal`을 호출하여 전역 모달 상태를 초기화하고 화면에서 제거.
 */
function ActivityPollModal() {
  const polls = useActivityDataStore((state) => state.polls);
  const modalState = useActivityModalStore((state) => state.modalState);

  const { close: closeModal } = useActivityModalStore((state) => state.actions);
  const { appendPoll, updatePoll } = useActivityDataStore((state) => state.actions);

  const isCreateMode = modalState.type === 'create-poll';
  const isEditMode = modalState.type === 'edit-poll';

  /**
   * 투표 모달 제출 핸들러
   * @param data 투표 폼 데이터
   */
  const handlePollSubmit = (data: PollFormValues) => {
    if (isCreateMode) appendPoll(data);
    else if (isEditMode) updatePoll(modalState.id, data);

    closeModal();
  };

  /**
   * ID로 항목 찾기 함수
   */
  const findPollById = useCallback((id: string) => polls.find((poll) => poll.id === id), [polls]);

  return (
    <PollModal
      isEditMode={isEditMode}
      isOpen={isCreateMode || isEditMode}
      initialData={isEditMode ? findPollById(modalState.id) : undefined}
      onClose={closeModal}
      onSubmit={handlePollSubmit}
    />
  );
}

/**
 * Q&A 모달 컴포넌트
 *
 * 강의실 내 Q&A 생성 및 수정을 담당하는 모달 컴포넌트
 * 스토어의 `modalState`에 따라 적절한 모달을 렌더링하고, 사용자 입력 데이터를 폼 상태에 반영
 *
 * 1. `useActivityModalStore`를 통해 현재 열려야 할 모달의 타입과 데이터 인덱스를 감지.
 * 2. `useActivityDataStore`로부터 활동 데이터(qnas)와 조작 액션(`append`, `update`)을 가져옴.
 * 3. 제출 발생 시, 현재 모달의 상태(`create` 또는 `edit`)를 판별하여 해당되는 폼 액션 실행.
 * 4. 데이터 반영 후 `closeModal`을 호출하여 전역 모달 상태를 초기화하고 화면에서 제거.
 */
function ActivityQnAModal() {
  const qnas = useActivityDataStore((state) => state.qnas);
  const modalState = useActivityModalStore((state) => state.modalState);

  const { close: closeModal } = useActivityModalStore((state) => state.actions);
  const { appendQna, updateQna } = useActivityDataStore((state) => state.actions);

  const isCreateMode = modalState.type === 'create-qna';
  const isEditMode = modalState.type === 'edit-qna';

  /**
   * Q&A 모달 제출 핸들러
   * @param data Q&A 폼 데이터
   */
  const handleQnaSubmit = (data: QnAFormValues) => {
    if (isCreateMode) appendQna(data);
    else if (isEditMode) updateQna(modalState.id, data);

    closeModal();
  };

  /**
   * ID로 항목 찾기 함수
   */
  const findQnaById = useCallback((id: string) => qnas.find((qna) => qna.id === id), [qnas]);

  return (
    <QnAModal
      isEditMode={isEditMode}
      isOpen={isCreateMode || isEditMode}
      initialData={isEditMode ? findQnaById(modalState.id) : undefined}
      onClose={closeModal}
      onSubmit={handleQnaSubmit}
    />
  );
}

/**
 * 활동 모달 컴포넌트 (투표/Q&A 생성 및 수정)
 *
 * 강의실 내 활동(투표, Q&A)의 생성 및 수정을 담당하는 모달들을 통합 관리하는 컨테이너 컴포넌트
 * 스토어의 `modalState`에 따라 적절한 모달을 렌더링하고, 사용자 입력 데이터를 폼 상태에 반영
 */
export function ActivityModals() {
  return (
    <>
      <ActivityPollModal />
      <ActivityQnAModal />
    </>
  );
}
