import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { CreateLectureFormValues, LECTURE_FORM_KEYS } from '../schema';
import { PollFormValues } from '@/shared/constants/poll';
import { QnAFormValues } from '@/shared/constants/qna';

interface ActivityContextValue {
  polls: PollFormValues[];
  qnas: QnAFormValues[];
  actions: {
    addPoll: (poll: PollFormValues) => void;
    editPoll: (index: number, poll: PollFormValues) => void;
    deletePoll: (index: number) => void;
    addQna: (qna: QnAFormValues) => void;
    editQna: (index: number, qna: QnAFormValues) => void;
    deleteQna: (index: number) => void;
  };
}

/**
 * 활동(투표/Q&A) 상태 및 제어 함수들 관리 컨텍스트
 */
const ActivityContext = createContext<ActivityContextValue | null>(null);

/**
 * 활동(투표/Q&A) 상태 및 제어 함수들 관리 Provider 컴포넌트
 * @param children 자식 컴포넌트들
 * @returns 활동 상태 및 제어 함수들 관리 Provider JSX 요소
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const { control } = useFormContext<CreateLectureFormValues>();

  const {
    fields: polls,
    append: appendPoll,
    update: updatePoll,
    remove: removePoll,
  } = useFieldArray({
    control,
    name: LECTURE_FORM_KEYS.polls,
  });

  const {
    fields: qnas,
    append: appendQna,
    update: updateQna,
    remove: removeQna,
  } = useFieldArray({
    control,
    name: LECTURE_FORM_KEYS.qnas,
  });

  const value = useMemo(
    () => ({
      polls: polls as unknown as PollFormValues[],
      qnas: qnas as unknown as QnAFormValues[],
      actions: {
        addPoll: appendPoll,
        editPoll: updatePoll,
        deletePoll: removePoll,
        addQna: appendQna,
        editQna: updateQna,
        deleteQna: removeQna,
      },
    }),
    [polls, qnas, appendPoll, updatePoll, removePoll, appendQna, updateQna, removeQna],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

/**
 * 활동(투표/Q&A) 상태 및 제어 함수들 사용 훅
 * @returns 활동 상태 및 제어 함수들
 */
export const useActivityActions = () => {
  const context = useContext(ActivityContext);
  if (!context) throw new Error('useActivity는 ActivityProvider 내에서 사용되어야 합니다');

  return context;
};
