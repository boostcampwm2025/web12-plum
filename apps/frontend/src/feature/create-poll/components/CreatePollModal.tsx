import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/components/Modal';
import { PollForm } from './PollForm';
import { pollFormDefaultValues, PollFormValues, pollFormSchema } from '../schema';
import { logger } from '@/shared/lib/logger';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: PollFormValues) => void;
}

/**
 * 투표 생성 모달 컴포넌트
 * @param isOpen - 모달 열림 상태
 * @param onClose - 모달 닫기 핸들러
 * @param onCreate - 투표 추가 핸들러
 * @returns 투표 생성 모달 JSX 요소
 */
export function CreatePollModal({ isOpen, onClose, onCreate }: CreatePollModalProps) {
  const formMethods = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: pollFormDefaultValues,
    mode: 'onChange',
  });

  const handleSubmit = (data: PollFormValues) => {
    logger.ui.info('투표 생성 데이터:', data);
    onCreate(data);
    formMethods.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-181.5"
    >
      <header className="flex items-center justify-between pb-4">
        <Modal.Title>새로운 투표 추가</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <PollForm
        formMethods={formMethods}
        onSubmit={handleSubmit}
        submitLabel="추가하기"
      />
    </Modal>
  );
}
