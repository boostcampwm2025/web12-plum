import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Modal } from '@/shared/components/Modal';
import { FormField } from '@/shared/components/FormField';
import { TimeLimitDropdown } from '@/shared/components/TimeLimitDropdown';
import { Button } from '@/shared/components/Button';
import {
  QNA_FORM_KEYS,
  qnaFormDefaultValues,
  qnaFormSchema,
  QnAFormValues,
} from '@/shared/constants/qna';
import { logger } from '@/shared/lib/logger';

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
  // react-hook-form 설정
  const formMethods = useForm<QnAFormValues>({
    resolver: zodResolver(qnaFormSchema),
    defaultValues: isEditMode && initialData ? initialData : qnaFormDefaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, register, reset, control, formState } = formMethods;

  // 모달 열릴 때 초기 데이터로 폼 리셋
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) reset(initialData);
      else if (!isEditMode) reset(qnaFormDefaultValues);
    }
  }, [isOpen, isEditMode, initialData, reset]);

  // 폼 제출 핸들러
  const handleSubmitForm = (data: QnAFormValues) => {
    logger.ui.info(isEditMode ? 'QnA 수정 데이터:' : 'QnA 생성 데이터:', data);

    onSubmit(data);
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

      <form
        className="flex h-full min-h-0 flex-col gap-6 overflow-y-scroll"
        onSubmit={handleSubmit(handleSubmitForm)}
      >
        {/* QnA 제목 필드 */}
        <FormField required>
          <FormField.Legend className="mb-2 font-extrabold">QnA 제목</FormField.Legend>
          <FormField.Input
            {...register(QNA_FORM_KEYS.title)}
            placeholder="무엇을 묻고 싶으신가요?"
          />
        </FormField>

        {/* 제한 시간 필드 */}
        <FormField required>
          <FormField.Legend className="mb-2 font-extrabold">제한 시간</FormField.Legend>
          <Controller
            control={control}
            name={QNA_FORM_KEYS.timeLimit}
            render={({ field: { onChange, value } }) => (
              <TimeLimitDropdown
                selectedTime={value}
                onChange={onChange}
              />
            )}
          />
        </FormField>

        {/* 익명 공개 여부 필드 */}
        <FormField>
          <div className="flex items-center gap-3">
            <FormField.CheckboxInput
              {...register(QNA_FORM_KEYS.isPublic)}
              checked={formMethods.watch(QNA_FORM_KEYS.isPublic)}
            />
            <FormField.Label className="text-text text-sm font-extrabold">
              익명으로 답변 전체 공개
            </FormField.Label>
          </div>
        </FormField>

        <Button
          type="submit"
          disabled={!formState.isValid}
          className="mx-auto w-full max-w-38.5"
        >
          {submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
