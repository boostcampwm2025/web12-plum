import { PollFormValues } from '@/shared/constants/poll';
import { QnAFormValues } from '@/shared/constants/qna';
import { PollModal } from '@/shared/components/PollModal';
import { QnAModal } from '@/shared/components/QnAModal';

import { useActivityActions } from '../hooks/useActivityActions';
import { useActivityModalStore } from '../store/useActivityModalStore';

/**
 * 활동 모달 컴포넌트 (투표/Q&A 생성 및 수정)
 *
 * 강의실 내 활동(투표, Q&A)의 생성 및 수정을 담당하는 모달들을 통합 관리하는 컨테이너 컴포넌트
 * 스토어의 `modalState`에 따라 적절한 모달을 렌더링하고, 사용자 입력 데이터를 폼 상태에 반영
 *
 * 1. `useActivityModalStore`를 통해 현재 열려야 할 모달의 타입과 데이터 인덱스를 감지.
 * 2. `useActivityActions`로부터 폼 배열(FieldArray) 데이터와 조작 액션(`append`, `update`)을 가져옴.
 * 3. 제출 발생 시, 현재 모달의 상태(`create` 또는 `edit`)를 판별하여 해당되는 폼 액션 실행.
 * 4. 데이터 반영 후 `closeModal`을 호출하여 전역 모달 상태를 초기화하고 화면에서 제거.
 */
export function ActivityModals() {
  const modalState = useActivityModalStore((state) => state.modalState);
  const { close: closeModal } = useActivityModalStore((state) => state.actions);
  const { polls, qnas, actions } = useActivityActions();

  /**
   * 투표 모달 제출 핸들러
   * @param data 투표 폼 데이터
   */
  const handlePollSubmit = (data: PollFormValues) => {
    if (modalState.type === 'create-poll') actions.appendPoll(data);
    else if (modalState.type === 'edit-poll') actions.updatePoll(modalState.index, data);

    closeModal();
  };

  /**
   * Q&A 모달 제출 핸들러
   * @param data Q&A 폼 데이터
   */
  const handleQnaSubmit = (data: QnAFormValues) => {
    if (modalState.type === 'create-qna') actions.appendQna(data);
    else if (modalState.type === 'edit-qna') actions.updateQna(modalState.index, data);

    closeModal();
  };

  const isPollModalOpen = modalState.type === 'create-poll' || modalState.type === 'edit-poll';
  const isQnaModalOpen = modalState.type === 'create-qna' || modalState.type === 'edit-qna';

  return (
    <>
      <PollModal
        isEditMode={modalState.type === 'edit-poll'}
        isOpen={isPollModalOpen}
        initialData={modalState.type === 'edit-poll' ? polls[modalState.index] : undefined}
        onClose={closeModal}
        onSubmit={handlePollSubmit}
      />
      <QnAModal
        isEditMode={modalState.type === 'edit-qna'}
        isOpen={isQnaModalOpen}
        initialData={modalState.type === 'edit-qna' ? qnas[modalState.index] : undefined}
        onClose={closeModal}
        onSubmit={handleQnaSubmit}
      />
    </>
  );
}
