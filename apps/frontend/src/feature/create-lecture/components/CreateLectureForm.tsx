import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';
import { logger } from '@/shared/lib/logger';

import {
  CreateLectureFormValues,
  createLectureSchema,
  LECTURE_FORM_KEYS,
  lectureFormDefaultValues,
} from '../schema';
import { ActivityProvider } from '../hooks/useActivityActionContext';
import { ActivityModalProvider, useActivityModalContext } from '../hooks/useActivityModalContext';
import { ActivityList } from './ActivityList';
import { ActivityModals } from './ActivityModals';
import { LecturePresentationUpload } from './LecturePresentationUpload';
import { LecturePresentationList } from './LecturePresentationList';

/**
 * 강의실 이름 섹션 컴포넌트
 * @returns 강의실 이름 섹션 JSX 요소
 */
function LectureNameSection() {
  const { register } = useFormContext<CreateLectureFormValues>();

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
 * @returns 호스트 이름 섹션 JSX 요소
 */
function HostNameSection() {
  const { register } = useFormContext<CreateLectureFormValues>();

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
 * @returns 데이터 수집 동의 섹션 JSX 요소
 */
function AgreementSection() {
  const { register } = useFormContext<CreateLectureFormValues>();
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
 * @returns 강의 활동 섹션 JSX 요소
 */
function ActivitySection() {
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
 * @returns 발표 자료 업로더 섹션 JSX 요소
 */
function PresentationUploaderSection() {
  const { setValue } = useFormContext<CreateLectureFormValues>();
  const presentationFiles: File[] = useWatch({ name: LECTURE_FORM_KEYS.presentationFiles }) || [];

  const handleFileSelect = (file: File) => {
    const updatedFiles = [...presentationFiles, file];
    setValue(LECTURE_FORM_KEYS.presentationFiles, updatedFiles, { shouldValidate: true });
  };

  return (
    <FormField className="gap-3">
      <FormField.Legend className="m-0 text-xl font-bold">발표 자료</FormField.Legend>
      <LecturePresentationUpload
        onFileSelect={handleFileSelect}
        onValidationError={(err) => logger.ui.error('파일 업로드 에러:', err)}
      />
      <LecturePresentationList />
    </FormField>
  );
}

/**
 * 강의 생성 폼 컴포넌트
 * @returns 강의 생성 폼 JSX 요소
 */
export function CreateLectureForm() {
  const formMethods = useForm<CreateLectureFormValues>({
    resolver: zodResolver(createLectureSchema),
    defaultValues: lectureFormDefaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, formState } = formMethods;

  const onSubmit = (data: CreateLectureFormValues) => {
    logger.ui.info('강의실 생성 최종 데이터:', data);
    // 서버 API 호출 로직
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
            <PresentationUploaderSection />

            <Button
              type="submit"
              disabled={!formState.isValid}
              className={cn(!formState.isValid && 'opacity-50', 'pt-4 text-xl')}
            >
              강의실 생성하기
            </Button>
          </form>
          <ActivityModals />
        </ActivityModalProvider>
      </ActivityProvider>
    </FormProvider>
  );
}
