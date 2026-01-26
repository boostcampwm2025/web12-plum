import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { logger } from '@/shared/lib/logger';
import { useSocketStore } from '@/store/useSocketStore';
import { ROUTES } from '@/app/routes/routes';

import { RoomButton } from './RoomButton';
import { RoomSignaling } from '../mediasoup/RoomSignaling';
import { useRoomStore } from '../stores/useRoomStore';

/**
 * 강의실 퇴장 버튼 컴포넌트
 */
export function ExitButton() {
  const navigate = useNavigate();
  const socket = useSocketStore((state) => state.socket);
  const myInfo = useRoomStore((state) => state.myInfo);

  /**
   * 강의실 퇴장 처리
   *
   * 1. 서버에 퇴장 알림 (발표자는 강의 종료, 참가자는 퇴장)
   * 2. 로컬 미디어 트랙 및 리소스 정리
   * 3. 로비 페이지로 이동
   */
  const handleExit = useCallback(async () => {
    try {
      logger.ui.info('[Room] 강의실 퇴장 시작');
      if (!socket) throw new Error('소켓이 연결되어 있지 않습니다');

      if (myInfo?.role === 'presenter') await RoomSignaling.breakRoom(socket);
      else await RoomSignaling.leaveRoom(socket);
    } catch (error) {
      logger.ui.warn('[Room] 서버 퇴장 알림 실패:', error);
    } finally {
      // TODO: 페이지 이동 (현재 로비로 이동, 추후에 요약 페이지로 이동)
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [socket, navigate, myInfo?.role]);

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
