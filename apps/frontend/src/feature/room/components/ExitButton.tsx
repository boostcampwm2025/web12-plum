import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isPresenter = myInfo?.role === 'presenter';

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
