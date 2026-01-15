import { useEffect, useState } from 'react';
import { useWatch, UseFormGetValues, UseFormTrigger, Control } from 'react-hook-form';
import type { EnterLectureRequestBody } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { ENTER_LECTURE_KEYS } from '../schema';

type CheckVariant = 'default' | 'success' | 'error';

interface UseNicknameValidationParams {
  roomId: string;
  control: Control<EnterLectureRequestBody>;
  trigger: UseFormTrigger<EnterLectureRequestBody>;
  getValues: UseFormGetValues<EnterLectureRequestBody>;
}

interface UseNicknameValidationReturn {
  nicknameValue: string;
  checkMessage: string;
  checkVariant: CheckVariant;
  handleCheckNickname: () => Promise<void>;
}

export function useNicknameValidation({
  roomId,
  control,
  trigger,
  getValues,
}: UseNicknameValidationParams): UseNicknameValidationReturn {
  const nicknameValue = useWatch({ name: ENTER_LECTURE_KEYS.nickname, control }) ?? '';
  const [checkMessage, setCheckMessage] = useState('');
  const [checkVariant, setCheckVariant] = useState<CheckVariant>('default');

  useEffect(() => {
    setCheckMessage((prev) => (prev === '' ? prev : ''));
    setCheckVariant((prev) => (prev === 'default' ? prev : 'default'));
  }, [nicknameValue]);

  const handleCheckNickname = async () => {
    const isValid = await trigger(ENTER_LECTURE_KEYS.nickname);
    if (!isValid) {
      setCheckMessage('닉네임을 올바르게 입력해주세요.');
      setCheckVariant('error');
      return;
    }

    const nickname = getValues(ENTER_LECTURE_KEYS.nickname).trim();

    try {
      const response = await roomApi.validateNickname(roomId, nickname);
      const currentNickname = getValues(ENTER_LECTURE_KEYS.nickname).trim();
      if (currentNickname !== nickname) return;

      if (response.data.available) {
        setCheckMessage('사용 가능한 닉네임입니다.');
        setCheckVariant('success');
      } else {
        setCheckMessage('이미 사용 중인 닉네임입니다.');
        setCheckVariant('error');
      }
    } catch (error) {
      logger.ui.error('닉네임 중복 확인 실패:', error);
      setCheckMessage('중복 확인에 실패했습니다.');
      setCheckVariant('error');
    }
  };

  return {
    nicknameValue,
    checkMessage,
    checkVariant,
    handleCheckNickname,
  };
}
