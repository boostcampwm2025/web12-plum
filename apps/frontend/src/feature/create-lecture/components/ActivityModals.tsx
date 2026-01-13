import { PollFormValues } from '@/shared/constants/poll';
import { QnAFormValues } from '@/shared/constants/qna';
import { PollModal } from '@/shared/components/PollModal';
import { QnAModal } from '@/shared/components/QnAModal';

import { useActivityActionContext } from '../hooks/useActivityActionContext';
import { useActivityModalContext } from '../hooks/useActivityModalContext';

/**
 * 활동 모달 컴포넌트 (투표/Q&A 생성 및 수정)
 * @returns 활동 모달 JSX 요소
 */
export function ActivityModals() {
  const { modalState, closeModal } = useActivityModalContext();
  const { polls, qnas, actions } = useActivityActionContext();

  // 투표 모달 제출 핸들러
  const handlePollSubmit = (data: PollFormValues) => {
    if (modalState.type === 'create-poll') actions.addPoll(data);
    else if (modalState.type === 'edit-poll') actions.editPoll(modalState.index, data);

    closeModal();
  };

  // Q&A 모달 제출 핸들러
  const handleQnaSubmit = (data: QnAFormValues) => {
    if (modalState.type === 'create-qna') actions.addQna(data);
    else if (modalState.type === 'edit-qna') actions.editQna(modalState.index, data);

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
