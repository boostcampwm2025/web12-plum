import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateRoomRequest } from '@plum/shared-interfaces';
import { createLectureSchema } from '@plum/shared-interfaces';

import { ROUTES } from '@/app/routes/routes';
import { useToastStore } from '@/store/useToastStore';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';
import { logger } from '@/shared/lib/logger';
import { FormField } from '@/shared/components/FormField';
import { Icon } from '@/shared/components/icon/Icon';
import { getUserFriendlyError } from '@/shared/api';
import { usePresentation } from '@/shared/hooks/usePresentation';

import { LECTURE_FORM_KEYS, lectureFormDefaultValues } from '../schema';
import { ActivityProvider } from '../hooks/useActivityActionContext';
import { ActivityModalProvider, useActivityModalContext } from '../hooks/useActivityModalContext';
import { useCreateRoom } from '../hooks/useCreateRoom';
import { ActivityModals } from './ActivityModals';
import { PresentationUploader } from './PresentationUploader';
import { PresentationList } from './PresentationList';
import { ActivityList } from './ActivityList';

/**
 * 강의실 이름 섹션 컴포넌트
 */
function LectureNameSection() {
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

/**
 * 호스트 이름 섹션 컴포넌트
 */
export function HostNameSection() {
  const { register } = useFormContext<CreateRoomRequest>();

  return (
    <FormField
      required
      className="gap-3"
    >
      <div className="flex items-center gap-4">
        <FormField.Legend className="m-0 text-xl font-bold">호스트 이름</FormField.Legend>
        <FormField.HelpText className="m-0">2~16자 이내</FormField.HelpText>
      </div>

      <FormField.Input
        {...register(LECTURE_FORM_KEYS.hostName)}
        size="lg"
        placeholder="예: 호눅스"
      />
    </FormField>
  );
}

/**
 * 데이터 수집 동의 섹션 컴포넌트
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

/**
 * 강의 활동 섹션 컴포넌트
 */
export function ActivitySection() {
  const { openCreatePollModal, openCreateQnaModal } = useActivityModalContext();

  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">강의 활동 구성</FormField.Legend>
      <ActivityList />

      <div className="ml-auto flex gap-3">
        <Button
          type="button"
          className="text-text"
          onClick={openCreatePollModal}
        >
          <Icon
            name="plus"
            size={20}
            decorative
          />
          <span>투표 추가</span>
        </Button>

        <Button
          type="button"
          onClick={openCreateQnaModal}
        >
          <Icon
            name="plus"
            size={20}
            decorative
          />
          <span>Q&A 추가</span>
        </Button>
      </div>
    </FormField>
  );
}

/**
 * 발표 자료 업로더 섹션 컴포넌트
 */
export function PresentationSection() {
  const { addToast } = useToastStore((state) => state.actions);
  const { presentationFiles, addFile, removeFile } = usePresentation<CreateRoomRequest>({
    fieldName: LECTURE_FORM_KEYS.presentationFiles,
  });

  const handleDelete = (index: number) => {
    removeFile(index);
    addToast({ type: 'success', title: '파일이 성공적으로 삭제되었습니다.' });
  };

  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">발표 자료</FormField.Legend>
      <PresentationUploader addFile={addFile} />
      <PresentationList
        files={presentationFiles}
        onDelete={handleDelete}
      />
    </FormField>
  );
}

/**
 * 강의 생성 폼 컴포넌트
 */
export function CreateLectureForm() {
  const navigate = useNavigate();
  const { addToast } = useToastStore((state) => state.actions);
  const { createRoom, isSubmitting } = useCreateRoom();

  const formMethods = useForm<CreateRoomRequest>({
    resolver: zodResolver(createLectureSchema),
    defaultValues: lectureFormDefaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, formState } = formMethods;

  const onSubmit = async (data: CreateRoomRequest) => {
    try {
      const response = await createRoom(data);
      navigate(ROUTES.ROOM(response.roomId));
    } catch (error) {
      logger.ui.error('강의실 생성 실패:', error);
      const { title, description } = getUserFriendlyError(error);

      addToast({ type: 'error', title, description });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <ActivityProvider>
        <ActivityModalProvider>
          <form
            className="mt-10 flex flex-col gap-8 rounded-2xl bg-gray-600 p-6"
            onSubmit={handleSubmit(onSubmit)}
          >
            <LectureNameSection />
            <HostNameSection />
            <AgreementSection />
            <ActivitySection />
            <PresentationSection />

            <Button
              type="submit"
              disabled={!formState.isValid || isSubmitting}
              className={cn((!formState.isValid || isSubmitting) && 'opacity-50', 'pt-4 text-xl')}
            >
              {isSubmitting ? '생성 중...' : '강의실 생성하기'}
            </Button>
          </form>
          <ActivityModals />
        </ActivityModalProvider>
      </ActivityProvider>
    </FormProvider>
  );
}
