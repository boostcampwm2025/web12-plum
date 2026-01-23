import { useEffect, useState } from 'react';
import { useWatch, UseFormGetValues, UseFormTrigger, Control } from 'react-hook-form';
import type { EnterLectureRequestBody } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { ENTER_LECTURE_KEYS } from '../schema';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';

type CheckVariant = 'default' | 'success' | 'error';

interface UseNicknameValidationParams {
  control: Control<EnterLectureRequestBody>;
  trigger: UseFormTrigger<EnterLectureRequestBody>;
  getValues: UseFormGetValues<EnterLectureRequestBody>;
}

interface UseNicknameValidationReturn {
  nicknameValue: string;
  checkMessage: string;
  checkVariant: CheckVariant;
  hasCheckedNickname: boolean;
  isNicknameAvailable: boolean;
  handleCheckNickname: () => Promise<void>;
  requireCheck: () => void;
}

export function useNicknameValidation({
  control,
  trigger,
  getValues,
}: UseNicknameValidationParams): UseNicknameValidationReturn {
  const roomId = useSafeRoomId();
  const nicknameValue = useWatch({ name: ENTER_LECTURE_KEYS.nickname, control }) ?? '';

  const [checkMessage, setCheckMessage] = useState('');
  const [checkVariant, setCheckVariant] = useState<CheckVariant>('default');
  const [hasCheckedNickname, setHasCheckedNickname] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(false);

  const applyCheckState = (
    message: string,
    variant: CheckVariant,
    checked: boolean,
    available: boolean,
  ) => {
    setCheckMessage(message);
    setCheckVariant(variant);
    setHasCheckedNickname(checked);
    setIsNicknameAvailable(available);
  };

  useEffect(() => {
    applyCheckState('', 'default', false, false);
  }, [nicknameValue]);

  const handleCheckNickname = async () => {
    if (!roomId) return;
    const isValid = await trigger(ENTER_LECTURE_KEYS.nickname);
    if (!isValid) {
      applyCheckState('닉네임을 올바르게 입력해주세요.', 'error', false, false);
      return;
    }

    const nickname = getValues(ENTER_LECTURE_KEYS.nickname).trim();

    try {
      const response = await roomApi.validateNickname(roomId, nickname);
      const currentNickname = getValues(ENTER_LECTURE_KEYS.nickname).trim();
      if (currentNickname !== nickname) return;

      if (response.data.available) {
        applyCheckState('사용 가능한 닉네임입니다.', 'success', true, true);
      } else {
        applyCheckState('이미 사용 중인 닉네임입니다.', 'error', true, false);
      }
    } catch (error) {
      logger.ui.error('닉네임 중복 확인 실패:', error);
      applyCheckState('중복 확인에 실패했습니다.', 'error', false, false);
    }
  };

  return {
    nicknameValue,
    checkMessage,
    checkVariant,
    hasCheckedNickname,
    isNicknameAvailable,
    handleCheckNickname,
    requireCheck: () => {
      applyCheckState('닉네임 중복 확인을 해주세요.', 'error', false, false);
    },
  };
}
