import { ROUTES } from '@/app/routes/routes';
import { useToastStore } from '@/store/useToastStore';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

interface UseSafeRoomIdOptions {
  fallbackPath?: string;
}

/**
 * 안전하게 roomId를 가져오는 훅
 * 없으면 지정된 경로로 리다이렉트 처리
 *
 * @param options 옵션 객체 (fallbackPath: 유효하지 않은 roomId일 때 리다이렉트할 경로, 기본값 메인페이지)
 * @returns 유효한 roomId 문자열 또는 null
 */
export function useSafeRoomId(options?: UseSafeRoomIdOptions) {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const { addToast } = useToastStore((state) => state.actions);

  const { fallbackPath = ROUTES.HOME } = options ?? {};
  const isValidRoomId = typeof roomId === 'string' && roomId.trim().length > 0;

  useEffect(() => {
    if (!isValidRoomId) {
      addToast({ type: 'error', title: '주소가 올바르지 않습니다.' });
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [isValidRoomId, navigate, fallbackPath, addToast]);

  return isValidRoomId ? (roomId as string) : null;
}
