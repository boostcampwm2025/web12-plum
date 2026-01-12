import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/components/Modal';
import { logger } from '@/shared/lib/logger';
import { qnaFormDefaultValues, qnaFormSchema, QnAFormValues } from '../schema';
import { QnAForm } from './QnAForm';

interface CreateQnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: QnAFormValues) => void;
}

/**
 * QnA 생성 모달 컴포넌트
 * @param isOpen - 모달 열림 상태
 * @param onClose - 모달 닫기 핸들러
 * @param onCreate - QnA 추가 핸들러
 * @returns QnA 생성 모달 JSX 요소
 */
export function CreateQnAModal({ isOpen, onClose, onCreate }: CreateQnAModalProps) {
  const formMethods = useForm<QnAFormValues>({
    resolver: zodResolver(qnaFormSchema),
    defaultValues: qnaFormDefaultValues,
    mode: 'onChange',
  });

  const handleSubmit = (data: QnAFormValues) => {
    logger.ui.info('QnA 생성 데이터:', data);
    onCreate(data);
    formMethods.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-134.5"
    >
      <header className="flex items-center justify-between pb-4">
        <Modal.Title>새로운 QnA 추가</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <QnAForm
        formMethods={formMethods}
        onSubmit={handleSubmit}
        submitLabel="추가하기"
      />
    </Modal>
  );
}
