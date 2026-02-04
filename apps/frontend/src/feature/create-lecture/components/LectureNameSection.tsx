import { useFormContext } from 'react-hook-form';
import type { CreateRoomRequest } from '@plum/shared-interfaces';

import { FormField } from '@/shared/components/FormField';

import { LECTURE_FORM_KEYS } from '../schema';

/**
 * 강의실 이름 섹션 컴포넌트
 *
 * 강의 생성 폼에서 식별자가 되는 '강의실 이름'을 입력받는 UI 섹션
 *
 * React Hook Form의 Context를 사용하여 상위 폼 상태에 접근하며,
 * 일관된 폼 스타일 유지를 위해 추상화된 FormField 컴포넌트를 활용
 *
 * 1. 컴포넌트 렌더링 시 상위 FormProvider로부터 `register` 함수를 가져옴.
 * 2. `LECTURE_FORM_KEYS.name`을 키로 사용하여 인풋을 폼 상태에 등록.
 * 3. 사용자가 입력값을 변경하면 내부적으로 `onChange` 이벤트가 발생하며 폼 상태 업데이트.
 * 4. 설정된 유효성 검사 규칙(5~30자)에 따라 실시간으로 에러 상태 계산
 */
export function LectureNameSection() {
  const { register } = useFormContext<CreateRoomRequest>();

  return (
    <FormField
      required
      className="gap-3"
    >
      <div className="flex items-center gap-4">
        <FormField.Legend className="m-0 text-xl font-bold">강의실 이름</FormField.Legend>
        <FormField.HelpText className="m-0">5~30자 이내</FormField.HelpText>
      </div>

      <FormField.Input
        {...register(LECTURE_FORM_KEYS.name)}
        size="lg"
        placeholder="예: 네이버부스트캠프 웹 풀스택"
      />
    </FormField>
  );
}
