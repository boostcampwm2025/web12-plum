import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { FormField } from '@/shared/components/FormField';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';

import { ENTER_LECTURE_KEYS, EnterLectureValues, enterLectureSchema } from '../schema';
import { LocalMediaPreview } from './LocalMediaPreview';

/**
 * 강의실 이름 입력 섹션
 * @returns 강의실 이름 입력 섹션 JSX 요소
 */
function LectureNameSection() {
  const { register } = useFormContext<EnterLectureValues>();

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
        {...register(ENTER_LECTURE_KEYS.name)}
        size="lg"
        readOnly
      />
    </FormField>
  );
}

/**
 * 호스트 닉네임 입력 섹션
 * @returns 호스트 닉네임 입력 섹션 JSX 요소
 */
function HostNameSection() {
  const { register } = useFormContext<EnterLectureValues>();

  return (
    <FormField
      required
      className="gap-3"
    >
      <div className="flex items-center gap-4">
        <FormField.Legend className="m-0 text-xl font-bold">닉네임</FormField.Legend>
        <FormField.HelpText className="m-0">2~16자 이내</FormField.HelpText>
      </div>

      <div className="flex gap-3">
        <FormField.Input
          {...register(ENTER_LECTURE_KEYS.nickname)}
          size="lg"
          placeholder="예: 호눅스"
        />
        <Button className="text-base font-extrabold">중복 확인</Button>
      </div>
    </FormField>
  );
}

/**
 * 데이터 수집 동의 섹션
 * @returns 데이터 수집 동의 섹션 JSX 요소
 */
function AgreementSection() {
  const { register } = useFormContext<EnterLectureValues>();
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

/**
 * 카메라 및 마이크 확인 섹션
 * @returns 카메라 및 마이크 확인 섹션 JSX 요소
 */
function MediaDeviceCheckSection() {
  const { register } = useFormContext<EnterLectureValues>();
  const isAudioOn = useWatch({ name: ENTER_LECTURE_KEYS.isAudioOn });
  const isVideoOn = useWatch({ name: ENTER_LECTURE_KEYS.isVideoOn });

  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">카메라 및 마이크 확인</FormField.Legend>
      <div className="flex items-center gap-2 rounded-lg border-2 border-gray-300 p-4">
        <LocalMediaPreview />

        <div className="mx-auto flex h-full flex-col justify-center gap-5">
          <FormField className="flex-row items-center gap-3">
            <FormField.Label>마이크</FormField.Label>
            <FormField.ToggleInput
              {...register(ENTER_LECTURE_KEYS.isAudioOn)}
              checked={isAudioOn}
            />
          </FormField>

          <FormField className="flex-row items-center gap-3">
            <FormField.Label>카메라</FormField.Label>
            <FormField.ToggleInput
              {...register(ENTER_LECTURE_KEYS.isVideoOn)}
              checked={isVideoOn}
            />
          </FormField>
        </div>
      </div>
    </FormField>
  );
}

/**
 * 강의실 입장 폼 컴포넌트
 * @returns 강의실 입장 폼 JSX 요소
 */
export function EnterLectureForm() {
  // TODO: 강의실 이름 API 연동
  const { lectureName } = { lectureName: '예시 강의실' };

  const formMethods = useForm<EnterLectureValues>({
    resolver: zodResolver(enterLectureSchema),
    defaultValues: {
      name: lectureName,
      nickname: '',
      isAgreed: false,
      isAudioOn: false,
      isVideoOn: false,
    },
    mode: 'onChange',
  });

  const { handleSubmit, formState } = formMethods;

  const onSubmit = (data: EnterLectureValues) => {
    logger.ui.info('EnterLectureForm: onSubmit', data);
  };

  return (
    <FormProvider {...formMethods}>
      <form
        className="mt-10 flex flex-col gap-8 rounded-2xl bg-gray-600 p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <LectureNameSection />
        <HostNameSection />
        <AgreementSection />
        <MediaDeviceCheckSection />

        <Button
          type="submit"
          disabled={!formState.isValid}
          className={cn(!formState.isValid && 'opacity-50', 'text-xl')}
        >
          강의실 입장하기
        </Button>
      </form>
    </FormProvider>
  );
}
