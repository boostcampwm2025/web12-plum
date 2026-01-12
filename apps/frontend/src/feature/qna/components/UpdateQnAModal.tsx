import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/components/Modal';
import { logger } from '@/shared/lib/logger';
import { qnaFormSchema, QnAFormValues } from '../schema';
import { QnAForm } from './QnAForm';

interface UpdateQnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: QnAFormValues;
  onUpdate: (data: QnAFormValues) => void;
}

/**
 * QnA 수정 모달 컴포넌트
 * @param isOpen - 모달 열림 상태
 * @param onClose - 모달 닫기 핸들러
 * @param initialData - 초기 폼 데이터
 * @param onUpdate - QnA 수정 핸들러
 * @returns QnA 수정 모달 JSX 요소
 */
export function UpdateQnAModal({ isOpen, onClose, initialData, onUpdate }: UpdateQnAModalProps) {
  const formMethods = useForm<QnAFormValues>({
    resolver: zodResolver(qnaFormSchema),
    defaultValues: initialData,
    mode: 'onChange',
  });

  const handleSubmit = (data: QnAFormValues) => {
    logger.ui.info('QnA 수정 데이터:', data);
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
        <Modal.Title>QnA 수정</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <QnAForm
        formMethods={formMethods}
        onSubmit={handleSubmit}
        submitLabel="수정하기"
      />
    </Modal>
  );
}
