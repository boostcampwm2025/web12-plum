import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/components/Modal';
import { PollForm } from './PollForm';
import { logger } from '@/shared/lib/logger';
import { PollFormValues, pollFormSchema } from '../schema';

interface UpdatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: PollFormValues;
  onUpdate: (data: PollFormValues) => void;
}

/**
 * 투표 수정 모달 컴포넌트
 * @param isOpen - 모달 열림 상태
 * @param onClose - 모달 닫기 핸들러
 * @param initialData - 초기 폼 데이터
 * @param onUpdate - 투표 수정 핸들러
 * @returns 투표 수정 모달 JSX 요소
 */
export function UpdatePollModal({ isOpen, onClose, initialData, onUpdate }: UpdatePollModalProps) {
  const formMethods = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: initialData,
    mode: 'onChange',
  });

  const handleSubmit = (data: PollFormValues) => {
    logger.ui.info('투표 수정 데이터:', data);
    onUpdate(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-181.5"
    >
      <header className="flex items-center justify-between pb-4">
        <Modal.Title>투표 수정</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <PollForm
        formMethods={formMethods}
        onSubmit={handleSubmit}
        submitLabel="수정하기"
      />
    </Modal>
  );
}
