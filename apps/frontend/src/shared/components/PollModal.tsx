import { useEffect } from 'react';
import {
  useFieldArray,
  useForm,
  Controller,
  FormProvider,
  useFormContext,
  FieldArrayWithId,
  UseFieldArrayRemove,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Modal } from '@/shared/components/Modal';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Icon } from '@/shared/components/icon/Icon';
import { TimeLimitDropdown } from '@/shared/components/TimeLimitDropdown';
import { logger } from '@/shared/lib/logger';
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_FORM_KEYS,
  pollFormDefaultValues,
  pollFormSchema,
  PollFormValues,
} from '@/shared/constants/poll';

interface PollOptionItemProps {
  index: number;
  onRemove: () => void;
  canDelete: boolean;
}

/**
 * 투표 선택지 아이템 컴포넌트
 * @param index - 선택지 인덱스
 * @param onRemove - 선택지 제거 핸들러
 * @param canDelete - 선택지 삭제 가능 여부
 * @returns 투표 선택지 아이템 JSX 요소
 */
function PollOptionItem({ index, onRemove, canDelete }: PollOptionItemProps) {
  const { register } = useFormContext<PollFormValues>();

  return (
    <li className="flex items-center gap-2">
      <Input
        size="md"
        className="grow"
        placeholder={`선택지 ${index + 1}`}
        {...register(`${POLL_FORM_KEYS.options}.${index}.value` as const)}
      />
      <Button
        variant="icon"
        className="cursor-pointer"
        onClick={onRemove}
        disabled={!canDelete}
        aria-label={`선택지 ${index + 1} 삭제`}
      >
        <Icon
          name="minus"
          size={24}
          strokeWidth={2}
          className="text-subtext"
          decorative
        />
      </Button>
    </li>
  );
}

interface PollOptionListProps {
  fields: FieldArrayWithId<PollFormValues, 'options', 'id'>[];
  remove: UseFieldArrayRemove;
}

/**
 * 투표 선택지 리스트 컴포넌트
 * @returns 투표 선택지 리스트 JSX 요소
 */
function PollOptionList({ fields, remove }: PollOptionListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <PollOptionItem
          key={field.id}
          index={index}
          onRemove={() => remove(index)}
          canDelete={fields.length > MIN_POLL_OPTIONS}
        />
      ))}
    </ul>
  );
}

interface PollModalProps {
  isEditMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  initialData?: PollFormValues;
  onSubmit: (data: PollFormValues) => void;
}

/**
 * 투표 생성/수정 모달 컴포넌트
 * @param isEditMode - 수정 모드 여부
 * @param isOpen - 모달 열림 상태
 * @param onClose - 모달 닫기 핸들러
 * @param initialData - 초기 폼 데이터 (수정 모드일 때 사용)
 * @param onSubmit - 폼 제출 핸들러
 * @returns 투표 모달 JSX 요소
 */
export function PollModal({
  isEditMode = false,
  isOpen,
  initialData,
  onClose,
  onSubmit,
}: PollModalProps) {
  const formMethods = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: isEditMode && initialData ? initialData : pollFormDefaultValues,
    mode: 'onChange',
  });

  const { register, control, handleSubmit, formState, reset } = formMethods;

  // 추가 버튼 활성화 여부 판단 위해 useFieldArray 훅 사용
  const { fields, append, remove } = useFieldArray({
    control,
    name: POLL_FORM_KEYS.options,
  });

  // 모달 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) reset(initialData);
      else if (!isEditMode) reset(pollFormDefaultValues);
    }
  }, [isOpen, isEditMode, initialData, reset]);

  // 폼 제출 핸들러
  const handleSubmitForm = (data: PollFormValues) => {
    logger.ui.info(isEditMode ? '투표 수정 데이터:' : '투표 생성 데이터:', data);

    onSubmit(data);
    onClose();
  };

  const title = isEditMode ? '투표 수정' : '새로운 투표 추가';
  const submitLabel = isEditMode ? '수정하기' : '추가하기';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-181.5"
    >
      <header className="flex items-center justify-between pb-4">
        <Modal.Title>{title}</Modal.Title>
        <Modal.CloseButton onClose={onClose} />
      </header>

      <FormProvider {...formMethods}>
        <form
          className="flex h-full min-h-0 flex-col gap-6 overflow-y-scroll"
          onSubmit={handleSubmit(handleSubmitForm)}
        >
          {/* 투표 제목 섹션 */}
          <FormField required>
            <FormField.Legend className="mb-2 font-extrabold">투표 제목</FormField.Legend>
            <FormField.Input
              {...register(POLL_FORM_KEYS.title)}
              placeholder="무엇을 묻고 싶으신가요?"
            />
          </FormField>

          {/* 투표 선택지 섹션 */}
          <FormField required>
            <FormField.Legend className="mb-2 font-extrabold">투표 선택지</FormField.Legend>
            <div className="flex flex-col gap-3">
              <PollOptionList
                fields={fields}
                remove={remove}
              />
              <Button
                variant="ghost"
                type="button"
                onClick={() => append({ value: '' })}
                disabled={fields.length >= MAX_POLL_OPTIONS}
                className="mx-auto w-fit"
              >
                <Icon
                  name="plus"
                  size={14}
                />
                <span>선택지 추가</span>
              </Button>
            </div>
          </FormField>

          {/* 제한 시간 섹션 */}
          <FormField required>
            <FormField.Legend className="mb-2 font-extrabold">제한 시간</FormField.Legend>
            <Controller
              control={control}
              name={POLL_FORM_KEYS.timeLimit}
              render={({ field: { onChange, value } }) => (
                <TimeLimitDropdown
                  selectedTime={value}
                  onChange={onChange}
                />
              )}
            />
          </FormField>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            disabled={!formState.isValid}
            className="mx-auto mt-2 w-full max-w-39"
          >
            {submitLabel}
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
