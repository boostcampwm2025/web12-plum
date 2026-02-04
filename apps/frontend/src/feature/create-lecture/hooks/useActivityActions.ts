import { useFieldArray, useFormContext } from 'react-hook-form';
import { CreateRoomRequest } from '@plum/shared-interfaces';
import { LECTURE_FORM_KEYS } from '../schema';

/**
 * 활동(투표/Q&A) FieldArray 관리 훅
 *
 * 강의 생성 시 포함되는 투표 및 Q&A 리스트를 React Hook Form의 FieldArray 기능을 통해 통합 관리
 * 배열 형태의 폼 데이터를 추가, 수정, 삭제하는 비즈니스 로직을 캡슐화하여 UI 컴포넌트에 제공
 *
 * 1. `useFormContext`를 통해 상위 폼의 `control` 객체에 접근하여 폼 상태를 구독함.
 * 2. 각 데이터 키(`polls`, `qnas`)에 대해 독립적인 `useFieldArray` 인스턴스를 생성하여 배열 상태 확보.
 * 3. `append`, `update`, `remove` 등 FieldArray 전용 메서드들을 액션 객체로 묶어 반환함.
 * 4. 컴포넌트에서 반환된 액션 호출 시, 폼 상태가 업데이트되며 실시간으로 유효성 검사 및 UI 동기화가 이루어짐.
 */
export function useActivityActions() {
  const { control } = useFormContext<CreateRoomRequest>();

  // 투표(Poll) 데이터 배열 및 조작 액션 관리
  const {
    fields: polls,
    append: appendPoll,
    update: updatePoll,
    remove: removePoll,
  } = useFieldArray({
    control,
    name: LECTURE_FORM_KEYS.polls,
  });

  // 질문(Q&A) 데이터 배열 및 조작 액션 관리
  const {
    fields: qnas,
    append: appendQna,
    update: updateQna,
    remove: removeQna,
  } = useFieldArray({
    control,
    name: LECTURE_FORM_KEYS.qnas,
  });

  return {
    polls,
    qnas,
    actions: {
      appendPoll,
      updatePoll,
      removePoll,
      appendQna,
      updateQna,
      removeQna,
    },
  };
}
