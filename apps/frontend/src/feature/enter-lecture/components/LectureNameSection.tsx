import { useFormContext } from 'react-hook-form';
import { EnterLectureRequestBody } from '@plum/shared-interfaces';

import { FormField } from '@/shared/components/FormField';

import { ENTER_LECTURE_KEYS } from '../schema';

/**
 * 강의실 입장 폼 내에서 '강의실 이름'을 표시하고 폼 상태와 연결하는 섹션
 *
 * 1. 상위의 `FormProvider`로부터 폼 컨텍스트를 전달받아 `name` 필드를 등록
 * 2. 서버에서 내려받은 강의실 이름을 수정할 수 없도록 `readOnly` 속성 부여
 */
export function LectureNameSection() {
  const { register } = useFormContext<EnterLectureRequestBody>();

  return (
    <FormField
      required
      className="gap-3"
    >
      <div className="flex items-center gap-4">
        <FormField.Legend className="m-0 text-xl font-bold">강의실 이름</FormField.Legend>
      </div>

      <FormField.Input
        {...register(ENTER_LECTURE_KEYS.name)}
        size="lg"
        readOnly
      />
    </FormField>
  );
}
