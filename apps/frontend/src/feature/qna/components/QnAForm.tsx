import { Controller, UseFormReturn } from 'react-hook-form';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/components/Button';
import { QNA_FORM_KEYS, QnAFormValues } from '../schema';
import { TimeLimitDropdown } from '@/shared/components/TimeLimitDropdown';

interface QnAFormProps {
  formMethods: UseFormReturn<QnAFormValues>;
  onSubmit: (data: QnAFormValues) => void;
  submitLabel: string;
}

/**
 * QnA 폼 컴포넌트
 * @param formMethods - react-hook-form의 폼 메서드 객체
 * @param onSubmit - 폼 제출 핸들러
 * @param submitLabel - 제출 버튼 라벨
 * @returns QnA 폼 JSX 요소
 */
export function QnAForm({ formMethods, onSubmit, submitLabel }: QnAFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { isValid },
  } = formMethods;

  return (
    <>
      <form className="flex h-full min-h-0 flex-col gap-6 overflow-y-scroll">
        <FormField required>
          <FormField.Legend className="mb-2 font-extrabold">QnA 제목</FormField.Legend>
          <FormField.Input
            {...register(QNA_FORM_KEYS.title, { required: true, minLength: 2 })}
            placeholder="무엇을 묻고 싶으신가요?"
          />
        </FormField>

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
      </form>

      <Button
        disabled={!isValid}
        className="mx-auto mt-8 w-full max-w-38.5"
        onClick={handleSubmit(onSubmit)}
      >
        {submitLabel}
      </Button>
    </>
  );
}
