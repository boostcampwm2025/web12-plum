import { useEffect } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateRoomRequest } from '@plum/shared-interfaces';
import { createLectureSchema } from '@plum/shared-interfaces';

import { ROUTES } from '@/app/routes/routes';
import { useToastStore } from '@/store/useToastStore';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';
import { logger } from '@/shared/lib/logger';
import { getUserFriendlyError } from '@/shared/api';

import { lectureFormDefaultValues } from '../schema';
import { useActivityModalStore } from '../store/useActivityModalStore';
import { useActivityDataStore } from '../store/useActivityDataStore';
import { useCreateRoom } from '../hooks/useCreateRoom';
import { ActivityModals } from './ActivityModals';
import { PresentationSection } from './PresentationSection';
import { ActivitySection } from './ActivitySection';
import { AgreementSection } from './AgreementSection';
import { HostNameSection } from './HostNameSection';
import { LectureNameSection } from './LectureNameSection';

/**
 * 강의 생성 폼 제출 버튼 컴포넌트
 *
 * 폼 컨텍스트의 유효성 상태를 구독하여 버튼의 활성화 여부를 결정하고, 최종 데이터를 서버로 전송
 *
 * 1. `useFormContext`를 통해 폼의 유효성(`isValid`)과 제출 핸들러(`handleSubmit`)를 가져옴.
 * 2. `useCreateRoom` 훅을 실행하여 서버 통신 로직 및 제출 중 상태(`isSubmitting`) 확보.
 * 3. 클릭 시 Zod 스키마 검증을 통과한 데이터를 `onSubmit`으로 전달받아 서버 API 호출.
 * 4. 생성 성공 시 해당 강의실 경로로 이동, 실패 시 사용자 친화적인 에러 토스트 노출.
 */
function SubmitButton() {
  const navigate = useNavigate();
  const polls = useActivityDataStore((state) => state.polls);
  const qnas = useActivityDataStore((state) => state.qnas);

  const { addToast } = useToastStore((state) => state.actions);
  const { createRoom, isSubmitting } = useCreateRoom();
  const { handleSubmit, formState } = useFormContext<CreateRoomRequest>();

  /**
   * 폼 제출 최종 핸들러
   *
   * 1. 사용자가 제출 버튼 클릭 시 `handleSubmit`에 의해 1차 유효성 검사 수행.
   * 2. 검증 통과 시 `onSubmit` 함수가 호출되며 정제된 `data`를 인자로 받음.
   * 3. `createRoom` 비동기 함수를 호출하여 서버에 강의실 생성 요청.
   * 4. 성공: 생성된 강의실 ID를 추출하여 해당 룸 경로로 사용자를 이동시킴(replace 모드).
   * 5. 실패: 로깅 후 에러 객체를 사용자 메시지로 변환 후 토스트 알림 노출.
   */
  const onSubmit = async (data: CreateRoomRequest) => {
    try {
      // 스토어의 활동 데이터(투표/Q&A)를 폼 데이터에 병합
      const requestData: CreateRoomRequest = { ...data, polls, qnas };
      const response = await createRoom(requestData);
      navigate(ROUTES.ROOM(response.roomId), { replace: true });
    } catch (error) {
      logger.ui.error('강의실 생성 실패:', error);
      const { title, description } = getUserFriendlyError(error);
      addToast({ type: 'error', title, description });
    }
  };

  return (
    <Button
      disabled={!formState.isValid || isSubmitting}
      className={cn((!formState.isValid || isSubmitting) && 'opacity-50', 'pt-4 text-xl')}
      onClick={handleSubmit(onSubmit)}
    >
      {isSubmitting ? '생성 중...' : '강의실 생성하기'}
    </Button>
  );
}

/**
 * 강의 생성 폼 컴포넌트
 *
 * 강의실 생성을 위한 모든 입력 섹션과 상태 관리 로직을 총괄하는 메인 폼 컨테이너
 *
 * 1. `useForm`을 초기화하고 Zod 스키마를 연동하여 강력한 타입 검증 환경 구축.
 * 2. `useEffect`를 통해 컴포넌트 파기 시 전역 모달 및 활동 데이터 스토어 상태 초기화.
 * 3. 각 입력 섹션(강의명, 호스트명, 동의항목 등)을 배치하고 `FormProvider`로 감싸 데이터 흐름 연결.
 * 4. 활동 생성을 위한 `ActivityModals`를 폼 바깥 영역에 배치하여 레이아웃 간섭 방지.
 */
export function CreateLectureForm() {
  const { close: closeModal } = useActivityModalStore((state) => state.actions);
  const { reset: resetActivityData } = useActivityDataStore((state) => state.actions);

  const formMethods = useForm<CreateRoomRequest>({
    resolver: zodResolver(createLectureSchema),
    defaultValues: lectureFormDefaultValues,
    mode: 'onChange',
  });

  // 컴포넌트 언마운트 시 스토어 상태 초기화
  useEffect(() => {
    return () => {
      closeModal();
      resetActivityData();
    };
  }, [closeModal, resetActivityData]);

  return (
    <FormProvider {...formMethods}>
      <form className="mt-10 flex flex-col gap-8 rounded-2xl bg-gray-600 p-6">
        <LectureNameSection />
        <HostNameSection />
        <AgreementSection />
        <ActivitySection />
        <PresentationSection />
        <SubmitButton />
      </form>
      <ActivityModals />
    </FormProvider>
  );
}
