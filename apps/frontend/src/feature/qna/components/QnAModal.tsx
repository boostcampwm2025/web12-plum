import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/components/Modal';
import { logger } from '@/shared/lib/logger';
import { qnaFormDefaultValues, qnaFormSchema, QnAFormValues } from '../schema';
import { QnAForm } from './QnAForm';

interface QnAModalProps {
  isEditMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  initialData?: QnAFormValues;
  onSubmit: (data: QnAFormValues) => void;
}

/**
 * QnA 모달 컴포넌트
 * @param isEditMode 편집 모드 여부
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 핸들러
 * @param initialData 초기 폼 데이터
 * @param onSubmit 폼 제출 핸들러
 * @returns QnA 모달 JSX 요소
 */
export function QnAModal({
  isEditMode = false,
  isOpen,
  onClose,
  initialData,
  onSubmit,
}: QnAModalProps) {
  const formMethods = useForm<QnAFormValues>({
    resolver: zodResolver(qnaFormSchema),
    defaultValues: isEditMode ? initialData : qnaFormDefaultValues,
    mode: 'onChange',
  });

  const { reset } = formMethods;

  // isEditMode 또는 initialData 변경 시 폼 초기화
  useEffect(() => {
    if (isEditMode && initialData) reset(initialData);
    else if (!isEditMode) reset(qnaFormDefaultValues);
  }, [isEditMode, initialData, reset]);

  // 폼 제출 핸들러
  const handleSubmit = (data: QnAFormValues) => {
    logger.ui.info(isEditMode ? 'QnA 수정 데이터:' : 'QnA 생성 데이터:', data);

    onSubmit(data);
    formMethods.reset();
    onClose();
  };

  const title = isEditMode ? 'QnA 수정' : '새로운 QnA 추가';
  const submitLabel = isEditMode ? '수정하기' : '추가하기';
  const className = isEditMode ? 'max-w-181.5' : 'w-full max-w-134.5';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={className}
    >
      <header className="flex items-center justify-between pb-4">
        <Modal.Title>{title}</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <QnAForm
        formMethods={formMethods}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
      />
    </Modal>
  );
}
