import { useNavigate } from 'react-router';
import { useFormContext } from 'react-hook-form';
import { EnterLectureRequestBody } from '@plum/shared-interfaces';

import { ROUTES } from '@/app/routes/routes';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { useToastStore } from '@/shared/stores/useToastStore';

import { EnterLectureFormValues } from '../schema';
import { useEnterRoom } from '../hooks/useEnterRoom';
import { useNicknameValidation } from '../hooks/useNicknameValidation';

/**
 * 강의실 입장 제출 버튼
 *
 * - 폼 유효성, 닉네임 중복 확인 여부, 제출 중 여부에 따라 버튼 활성/비활성을 제어
 * - 닉네임이 미검증 상태면 제출을 막고, 필요 시 `nickname` 필드에 에러를 설정해 안내
 * - useEnterRoom 훅을 사용해 입장 API를 호출하고, 성공 시 강의실 페이지로 이동
 * - 입장 실패 시 에러를 로깅하고 토스트로 에러 메시지를 노출
 */
export function SubmitButton() {
  const roomId = useSafeRoomId();
  const navigate = useNavigate();

  const { addToast } = useToastStore((state) => state.actions);
  const { isSubmitting, enterRoom } = useEnterRoom(roomId);
  const { formState, handleSubmit } = useFormContext<EnterLectureFormValues>();
  const { hasCheckedNickname } = useNicknameValidation();

  const isSubmitDisabled = !hasCheckedNickname || !formState.isValid || isSubmitting;

  const onSubmit = async (data: EnterLectureFormValues) => {
    if (!roomId) return;

    try {
      const { _nicknameChecked, ...payload } = data;
      await enterRoom(payload as EnterLectureRequestBody);
      navigate(ROUTES.ROOM(roomId), { replace: true });
    } catch {
      addToast({
        type: 'error',
        title: '강의실 입장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
  };

  if (!roomId) return null;

  return (
    <Button
      disabled={isSubmitDisabled}
      className={cn(isSubmitDisabled && 'opacity-50', 'text-xl')}
      onClick={handleSubmit(onSubmit)}
    >
      {isSubmitting ? '입장 중...' : '강의실 입장하기'}
    </Button>
  );
}
