import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { logger } from '@/shared/lib/logger';
import { ROUTES } from '@/app/routes/routes';

import { RoomButton } from './RoomButton';
import { useRoomStore } from '../stores/useRoomStore';
import { SocketClient } from '@/shared/socket/socket';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { useMediaCleanup } from '../hooks/useMediaCleanup';

/**
 * 강의실 퇴장 버튼 컴포넌트
 *
 * 사용자가 직접 '나가기' 버튼을 클릭했을 때의 퇴장 처리
 *
 * ## 역할별 동작
 * - presenter: 'break_room' 이벤트 -> 방 자체가 종료됨 (모든 참가자에게 room-end 이벤트)
 * - participant: 'leave_room' 이벤트 -> 본인만 퇴장 (다른 참가자에게 user-left 이벤트)
 *
 * ## RoomEndedModal과의 차이
 * - ExitButton: 사용자가 직접 나가기 (능동적)
 * - RoomEndedModal: 발표자가 방을 종료해서 강제 퇴장 (수동적)
 */
export function ExitButton() {
  const navigate = useNavigate();
  const roomId = useSafeRoomId();
  const { cleanupMedia } = useMediaCleanup();

  const myInfo = useRoomStore((state) => state.myInfo);
  const roomActions = useRoomStore((state) => state.actions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isPresenter = myInfo?.role === 'presenter';

  /**
   * 강의실 퇴장 처리
   *
   * 실행 순서:
   * 1. 서버에 퇴장 알림 전송
   *    - presenter: 'break_room' -> 방 종료 (다른 참가자들에게 room-end 이벤트 발생)
   *    - participant: 'leave_room' -> 본인만 퇴장 (다른 참가자들에게 user-left 이벤트 발생)
   * 2. isRoomEnded 상태 초기화 (다른 방 입장 시 모달이 뜨지 않도록)
   * 3. 미디어 자원 정리 (Producer, Consumer, Transport 등)
   * 4. 요약 페이지로 이동 (replace: true -> 뒤로가기 시 방으로 돌아오지 않음)
   *
   * 서버 알림 실패해도 finally에서 정리 및 이동은 진행됨
   */
  const handleExit = useCallback(async () => {
    const isPresenter = myInfo?.role === 'presenter';

    try {
      logger.ui.info('[ExitButton] 강의실 퇴장 시작');

      if (isPresenter) await SocketClient.emitWithAck('break_room');
      else await SocketClient.emitWithAck('leave_room');
    } catch (error) {
      logger.ui.error('[ExitButton] 서버 퇴장 알림 실패:', error);
    } finally {
      roomActions.setRoomEnded(false);
      await cleanupMedia();
      navigate(ROUTES.ROOM_SUMMARY(roomId!), { replace: true });
    }
  }, [navigate, myInfo?.role, roomId, roomActions, cleanupMedia]);

  const handleConfirmExit = useCallback(async () => {
    setIsModalOpen(false);
    await handleExit();
  }, [handleExit]);

  return (
    <>
      <RoomButton
        icon="exit"
        tooltip="나가기"
        variant="ghost"
        onClick={() => setIsModalOpen(true)}
        className="text-error hover:bg-error/10"
      />
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-sm"
      >
        <div className="flex flex-col">
          <p className="text-text items-center py-6 text-center text-lg font-bold">
            {isPresenter ? '정말 강의를 종료하시겠어요?' : '정말 나가시겠어요?'}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-2 text-sm"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmExit}
              className="px-3 py-2 text-sm"
            >
              {isPresenter ? '강의 종료' : '나가기'}{' '}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
