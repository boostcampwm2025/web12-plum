import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

import { ENTER_LECTURE_KEYS, EnterLectureFormValues } from '../schema';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';

type CheckVariant = 'default' | 'success' | 'error';

/**
 * 닉네임 필드에 대한 서버 중복 확인 유스케이스를 캡슐화하는 훅
 *
 * - 닉네임 검증 상태를 관리
 * - 서버 중복 확인 결과를 `_nicknameChecked` 플래그와 `errors.nickname`으로 반영
 * - 응답 대기 중 닉네임이 변경되면 해당 응답을 무시해 race condition을 방지
 * - UI에서 사용할 로딩 상태, 검증 결과 variant, 에러 메시지를 파생 값으로 제공
 */
export function useNicknameValidation() {
  const roomId = useSafeRoomId();
  const [isServerChecking, setIsServerChecking] = useState(false);

  const { nickname: nicknameKey, _nicknameChecked: nicknameCheckedKey } = ENTER_LECTURE_KEYS;
  const { trigger, getValues, setValue, clearErrors, setError, control } =
    useFormContext<EnterLectureFormValues>();
  const { errors } = useFormState<EnterLectureFormValues>({ name: [nicknameKey], control });

  const nicknameValue = useWatch({ name: nicknameKey, control }) ?? '';
  const hasCheckedNickname = useWatch({ name: nicknameCheckedKey, control }) ?? false;

  const lastCheckedNickname = useRef<string>('');
  const isNicknameAvailable = hasCheckedNickname && !errors[nicknameKey];

  // 닉네임 검증 상태에 따른 UI 메시지 variant 결정
  const isNicknameChecked = hasCheckedNickname && !errors[nicknameKey];
  const checkVariant: CheckVariant = isNicknameChecked
    ? 'success'
    : errors[nicknameKey]
      ? 'error'
      : 'default';

  /**
   * 현재 폼에 입력된 닉네임을 로컬 규칙으로 검증하고, 유효한 경우 공백을 제거한 닉네임을 반환
   *
   * - trigger를 통해 nickname 필드 스키마/유효성 검증을 먼저 수행
   * - 유효하지 않거나 닉네임이 비어 있는 경우 `_nicknameChecked`를 false로 되돌리고 `{ ok: false }`를 반환
   * - 유효한 경우 `{ ok: true, nickname }` 형태로 트리밍된 닉네임을 반환
   */
  const validateNicknameLocally = useCallback(async () => {
    const isValid = await trigger(nicknameKey);
    const nickname = getValues(nicknameKey)?.trim();

    if (!isValid || !nickname) {
      if (hasCheckedNickname) setValue(nicknameCheckedKey, false);
      return { ok: false as const };
    }

    return { ok: true as const, nickname };
  }, [trigger, getValues, setValue, hasCheckedNickname, nicknameKey, nicknameCheckedKey]);

  /**
   * 현재 입력된 닉네임에 대해 서버 중복 확인을 실행하고, 결과를 폼 상태에 반영
   *
   * - 로컬 검증에 실패하거나 닉네임이 비어 있으면 조기에 종료
   * - 직전에 성공적으로 체크한 닉네임과 동일하면 서버 호출을 생략
   * - 응답 도착 시점에 닉네임이 변경된 경우, 해당 응답은 폐기하여 race condition 방지
   */
  const handleCheckNickname = useCallback(async () => {
    if (!roomId || isServerChecking) return;

    // 로컬 검증 수행
    const result = await validateNicknameLocally();
    if (!result.ok) return;

    const isSameNickname = hasCheckedNickname && result.nickname === lastCheckedNickname.current;
    if (isSameNickname) return;

    setIsServerChecking(true);
    try {
      const response = await roomApi.validateNickname(roomId, result.nickname);

      // Race Condition 방지
      const currentNickname = getValues(nicknameKey)?.trim();
      if (currentNickname !== result.nickname) return;

      // 서버 응답에 따라 폼 상태 업데이트
      if (response.data.available) {
        lastCheckedNickname.current = result.nickname;
        clearErrors(nicknameKey);
        setValue(nicknameCheckedKey, true, { shouldDirty: false });
      } else {
        setValue(nicknameCheckedKey, false);
        setError(nicknameKey, {
          type: 'manual',
          message: '이미 사용 중인 닉네임입니다.',
        });
      }
    } catch (error) {
      logger.ui.error('닉네임 중복 확인 실패:', error);
      setValue(nicknameCheckedKey, false);
      setError(nicknameKey, {
        type: 'manual',
        message: '중복 확인에 실패했습니다.',
      });
    } finally {
      setIsServerChecking(false);
    }
  }, [
    roomId,
    isServerChecking,
    validateNicknameLocally,
    getValues,
    nicknameKey,
    hasCheckedNickname,
    clearErrors,
    setValue,
    nicknameCheckedKey,
    setError,
  ]);

  // 닉네임이 바뀌면 이전 중복 확인 결과는 더 이상 신뢰할 수 없으므로 무효화
  useEffect(() => {
    setValue(nicknameCheckedKey, false);
  }, [nicknameValue, setValue, nicknameCheckedKey]);

  return {
    isChecking: isServerChecking,
    checkVariant,
    nicknameValue,
    hasCheckedNickname,
    isNicknameAvailable,
    errorMessage: errors[nicknameKey]?.message,
    handleCheckNickname,
  };
}
