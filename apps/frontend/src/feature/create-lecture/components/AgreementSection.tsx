import { useFormContext, useWatch } from 'react-hook-form';
import type { CreateRoomRequest } from '@plum/shared-interfaces';

import { FormField } from '@/shared/components/FormField';

import { LECTURE_FORM_KEYS } from '../schema';

/**
 * 강의 생성 시 필수적인 '데이터 수집 및 이용 동의'를 받는 섹션
 *
 * 수집 항목을 리스트 형태로 명시하며, 체크박스를 통해 동의 여부를 확인
 *
 * 1. 상위 FormProvider로부터 `register`와 `formState`를 가져옴.
 * 2. `useWatch`를 통해 `isAgreed` 필드의 실시간 변경 사항을 구독하여 checked 상태에 반영.
 * 3. 사용자가 체크박스 클릭 시 `register`에 의해 바인딩된 `onChange`가 실행되어 폼 상태 업데이트.
 * 4. 동의하지 않은 상태에서는 폼 제출 버튼 비활성화
 */
export function AgreementSection() {
  const { register } = useFormContext<CreateRoomRequest>();
  const isAgreed = useWatch({ name: LECTURE_FORM_KEYS.isAgreed });

  return (
    <FormField
      required
      className="gap-3"
    >
      <FormField.Legend className="mb-3 text-xl font-bold">데이터 수집 동의</FormField.Legend>
      <ul className="text-text flex list-inside list-decimal flex-col gap-3 rounded-lg border-2 border-gray-300 p-4 text-base font-bold">
        <li>참여도·발화 분석 데이터를 수집합니다.</li>
        <li>투표·질문 응답 데이터를 수집합니다.</li>
        <li>제스처·반응 데이터를 수집합니다.</li>
      </ul>

      <div className="flex items-center gap-3">
        <FormField.CheckboxInput
          {...register(LECTURE_FORM_KEYS.isAgreed)}
          checked={isAgreed}
        />
        <FormField.Label className="text-text cursor-pointer text-base font-extrabold">
          데이터 수집에 동의합니다.
        </FormField.Label>
      </div>
    </FormField>
  );
}
