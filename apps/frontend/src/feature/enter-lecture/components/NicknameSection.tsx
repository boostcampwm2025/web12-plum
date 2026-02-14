import { useFormContext } from 'react-hook-form';

import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/components/Button';

import { ENTER_LECTURE_KEYS, EnterLectureFormValues } from '../schema';
import { useNicknameValidation } from '../hooks/useNicknameValidation';

/**
 * 닉네임 입력 및 중복 확인 섹션
 *
 * - 닉네임 필드 입력, 서버 중복 확인 버튼, 검증 메시지 UI를 렌더링
 * - 닉네임 검증/중복 확인 로직은 useNicknameValidation 훅에 위임하고, 이 컴포넌트는 UI 구성에만 집중
 */
export function NicknameSection() {
  const { register } = useFormContext<EnterLectureFormValues>();
  const {
    isChecking,
    checkVariant,
    isNicknameAvailable,
    nicknameValue,
    errorMessage,
    handleCheckNickname,
  } = useNicknameValidation();

  const successMessage = isNicknameAvailable ? '사용 가능한 닉네임입니다.' : '';
  const isCheckDisabled = !nicknameValue.trim() || isChecking;

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
          onClick={handleCheckNickname}
          disabled={isCheckDisabled}
        >
          중복 확인
        </Button>
      </div>
      <FormField.HelpText variant={checkVariant}>{successMessage}</FormField.HelpText>
    </FormField>
  );
}
