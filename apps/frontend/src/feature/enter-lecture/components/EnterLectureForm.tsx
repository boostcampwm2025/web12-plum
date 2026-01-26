import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EnterLectureRequestBody, enterLectureSchema } from '@plum/shared-interfaces';

import { FormField } from '@/shared/components/FormField';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';

import { enterLectureDefaultValues, ENTER_LECTURE_KEYS } from '../schema';
import { LocalMediaPreview } from './LocalMediaPreview';
import { useEnterRoom } from '../hooks/useEnterRoom';
import { useNicknameValidation } from '../hooks/useNicknameValidation';
import { useToastStore } from '@/store/useToastStore';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from 'react-router';

/**
 * 강의실 이름 입력 섹션
 * @returns 강의실 이름 입력 섹션 JSX 요소
 */
function LectureNameSection() {
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

/**
 * 닉네임 입력 섹션
 * @returns 닉네임 입력 섹션 JSX 요소
 */
interface NicknameSectionProps {
  errorMessage?: string;
  checkMessage?: string;
  checkVariant?: 'default' | 'success' | 'error';
  isCheckDisabled: boolean;
  onCheckNickname: () => void;
}

function NicknameSection({
  errorMessage,
  checkMessage,
  checkVariant = 'default',
  isCheckDisabled,
  onCheckNickname,
}: NicknameSectionProps) {
  const { register } = useFormContext<EnterLectureRequestBody>();

  return (
    <FormField
      required
      error={errorMessage}
    >
      <div className="mb-3 flex items-center gap-4">
        <FormField.Legend className="m-0 text-xl font-bold">닉네임</FormField.Legend>
        <FormField.HelpText className="m-0">2~16자 이내</FormField.HelpText>
      </div>

      <div className="flex gap-3">
        <FormField.Input
          {...register(ENTER_LECTURE_KEYS.nickname)}
          size="lg"
          placeholder="예: 호눅스"
        />
        <Button
          type="button"
          className="text-base font-extrabold"
          onClick={onCheckNickname}
          disabled={isCheckDisabled}
        >
          중복 확인
        </Button>
      </div>
      <FormField.HelpText variant={checkVariant}>{checkMessage || ''}</FormField.HelpText>
    </FormField>
  );
}

/**
 * 데이터 수집 동의 섹션
 * @returns 데이터 수집 동의 섹션 JSX 요소
 */
function AgreementSection() {
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

/**
 * 카메라 및 마이크 확인 섹션
 * @returns 카메라 및 마이크 확인 섹션 JSX 요소
 */
function MediaDeviceCheckSection() {
  const { register } = useFormContext<EnterLectureRequestBody>();
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
interface EnterLectureFormProps {
  roomId: string;
  lectureName?: string;
}

export function EnterLectureForm({ roomId, lectureName = '예시 강의실' }: EnterLectureFormProps) {
  const navigate = useNavigate();

  const { enterRoom, isSubmitting } = useEnterRoom();
  const { addToast } = useToastStore((state) => state.actions);

  const formMethods = useForm<EnterLectureRequestBody>({
    resolver: zodResolver(enterLectureSchema),
    defaultValues: { ...enterLectureDefaultValues, name: lectureName },
    mode: 'onChange',
  });

  const { handleSubmit, formState, getValues, setError, trigger, control } = formMethods;
  const {
    nicknameValue,
    checkMessage,
    checkVariant,
    hasCheckedNickname,
    isNicknameAvailable,
    handleCheckNickname,
    requireCheck,
  } = useNicknameValidation({ control, trigger, getValues });

  const onSubmit = async (data: EnterLectureRequestBody) => {
    logger.ui.info('강의실 입장 폼 제출 시도', data);

    const isNicknameCheckInvalid = !hasCheckedNickname || !isNicknameAvailable;
    if (isNicknameCheckInvalid) {
      requireCheck();
      setError(
        ENTER_LECTURE_KEYS.nickname,
        { type: 'manual', message: '닉네임 중복 확인을 해주세요.' },
        { shouldFocus: true },
      );
      return;
    }

    try {
      await enterRoom(data);

      logger.ui.info('강의실 입장 폼 제출 성공');
      const mediaState = { isAudioOn: data.isAudioOn, isVideoOn: data.isVideoOn };
      navigate(ROUTES.ROOM(roomId), { state: mediaState });
    } catch (error) {
      logger.ui.error('강의실 입장 실패:', error);
      // TODO: API 에러별 메시지 추가
      // if (error instanceof ApiError) {}
      addToast({ type: 'error', title: '강의실 입장에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
    logger.ui.info('강의실 입장 폼 제출 완료');
  };

  const isSubmitDisabled = !formState.isValid || isSubmitting;

  return (
    <FormProvider {...formMethods}>
      <form
        className="mt-10 flex flex-col gap-8 rounded-2xl bg-gray-600 p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <LectureNameSection />
        <NicknameSection
          errorMessage={formState.errors.nickname?.message}
          checkMessage={checkMessage}
          checkVariant={checkVariant}
          isCheckDisabled={!nicknameValue?.trim()}
          onCheckNickname={handleCheckNickname}
        />
        <AgreementSection />
        <MediaDeviceCheckSection />

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className={cn(isSubmitDisabled && 'opacity-50', 'text-xl')}
        >
          {isSubmitting ? '입장 중...' : '강의실 입장하기'}
        </Button>
      </form>
    </FormProvider>
  );
}
