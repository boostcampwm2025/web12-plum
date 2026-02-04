import { useFormContext, useWatch } from 'react-hook-form';
import { EnterLectureRequestBody } from '@plum/shared-interfaces';

import { FormField } from '@/shared/components/FormField';

import { ENTER_LECTURE_KEYS } from '../schema';

/**
 * 강의 참여 시 발생하는 데이터 수집에 대한 사용자 동의를 받는 섹션
 *
 * 1. 리스트 형식으로 수집 대상 데이터 안내
 * 2. `useWatch`를 통해 체크박스의 동의 여부를 실시간으로 감시하여 checked 상태에 반영
 */
export function AgreementSection() {
  const { register } = useFormContext<EnterLectureRequestBody>();
  const isAgreed = useWatch({ name: ENTER_LECTURE_KEYS.isAgreed });

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
          {...register(ENTER_LECTURE_KEYS.isAgreed)}
          checked={isAgreed}
        />
        <FormField.Label className="m-0 cursor-pointer text-base font-extrabold">
          데이터 수집에 동의합니다.
        </FormField.Label>
      </div>
    </FormField>
  );
}
