import { Controller, useFieldArray, UseFormReturn } from 'react-hook-form';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { TimeLimitDropdown } from './common';
import { PollOptionList } from './PollOptionList';
import { MAX_POLL_OPTIONS } from '../constants';
import { POLL_FORM_KEYS, PollFormValues } from '../schema';

interface PollFormProps {
  formMethods: UseFormReturn<PollFormValues>;
  onSubmit: (data: PollFormValues) => void;
  submitLabel: string;
}

/**
 * 투표 폼 컴포넌트
 * @param formMethods - react-hook-form의 폼 메서드 객체
 * @param onSubmit - 폼 제출 핸들러
 * @param submitLabel - 제출 버튼 라벨
 * @returns 투표 폼 JSX 요소
 */
export function PollForm({ formMethods, onSubmit, submitLabel }: PollFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { isValid },
  } = formMethods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: POLL_FORM_KEYS.options,
  });

  return (
    <form
      className="flex h-full min-h-0 flex-col gap-6 overflow-y-scroll"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormField required>
        <FormField.Legend className="mb-2 font-extrabold">투표 제목</FormField.Legend>
        <FormField.Input
          {...register(POLL_FORM_KEYS.title, { required: true, minLength: 2 })}
          placeholder="무엇을 묻고 싶으신가요?"
        />
      </FormField>

      <FormField required>
        <FormField.Legend className="mb-2 font-extrabold">투표 선택지</FormField.Legend>
        <div className="flex flex-col gap-3">
          <PollOptionList
            fields={fields}
            register={register}
            onDelete={remove}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={() => append({ value: '' })}
            disabled={fields.length >= MAX_POLL_OPTIONS}
          >
            <Icon
              name="plus"
              size={14}
            />
            <span>선택지 추가</span>
          </Button>
        </div>
      </FormField>

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

      <Button
        type="submit"
        disabled={!isValid}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
