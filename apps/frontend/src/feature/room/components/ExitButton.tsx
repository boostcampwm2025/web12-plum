import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { logger } from '@/shared/lib/logger';
import { useSocketStore } from '@/store/useSocketStore';
import { ROUTES } from '@/app/routes/routes';

import { RoomButton } from './RoomButton';
import { useMediaControlContext } from '../hooks/useMediaControlContext';
import { RoomSignaling } from '../mediasoup/RoomSignaling';

/**
 * 강의실 퇴장 버튼 컴포넌트
 */
export function ExitButton() {
  const navigate = useNavigate();
  const { socket } = useSocketStore();
  const { cleanup } = useMediaControlContext();

  /**
   * 강의실 퇴장 처리
   *
   * 1. 서버에 퇴장 알림
   * 2. 로컬 미디어 트랙 및 리소스 정리
   * 3. 로비 페이지로 이동
   */
  const handleExit = useCallback(async () => {
    try {
      logger.ui.info('[Room] 강의실 퇴장 시작');
      if (socket) await RoomSignaling.leaveRoom(socket);
    } catch (error) {
      logger.ui.warn('[Room] 서버 퇴장 알림 실패:', error);
    } finally {
      cleanup();
      logger.ui.debug('[Room] 로컬 미디어 및 리소스 정리 완료');

      // TODO: 페이지 이동 (현재 로비로 이동, 추후에 요약 페이지로 이동)
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [socket, cleanup, navigate]);

  return (
    <RoomButton
      icon="exit"
      tooltip="나가기"
      variant="ghost"
      onClick={handleExit}
      className="text-error hover:bg-error/10"
    />
  );
}
