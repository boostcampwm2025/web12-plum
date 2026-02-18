import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/routes/routes';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Icon } from '@/shared/components/icon/Icon';
import { logger } from '@/shared/lib/logger';
import { SocketClient } from '@/shared/socket/socket';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { useToastStore } from '@/store/useToastStore';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaCleanup } from '../hooks/useMediaCleanup';
import { RoomButton } from './RoomButton';

interface ExitConfirmModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

/**
 * 강의실 퇴장 확인 모달 컴포넌트
 *
 * 사용자가 나가기 버튼을 클릭했을 때 표시되는 확인 모달
 *
 * 1. 강의 요약 페이지 링크 표시
 * 2. 확인 버튼 클릭 시 서버에 퇴장 알림 전송
 * 3. 미디어 자원 정리 후 페이지 이동
 *    - 강의자: 요약 페이지로 이동 (강의 종료됨)
 *    - 참여자: 메인 페이지로 이동 (강의 진행 중)
 */
export function ExitConfirmModal({ isModalOpen, setIsModalOpen }: ExitConfirmModalProps) {
  const navigate = useNavigate();
  const roomId = useSafeRoomId();

  const { cleanupMedia } = useMediaCleanup();
  const { addToast } = useToastStore((state) => state.actions);

  const myInfo = useRoomStore((state) => state.myInfo);
  const roomActions = useRoomStore((state) => state.actions);

  // 강의 요약 페이지 링크
  const summaryLink = roomId ? `${window.location.origin}${ROUTES.ROOM_SUMMARY(roomId)}` : '';
  const isPresenter = myInfo?.role === 'presenter';

  /**
   * 강의 요약 페이지 링크 복사
   *
   * 1. Clipboard API를 사용해 요약 페이지 링크 복사 시도
   * 2. 성공 시 성공 토스트 알림 표시
   * 3. 실패 시 에러 로그 기록 및 실패 토스트 알림 표시
   */
  const copySummaryLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryLink);
      addToast({ type: 'success', title: '링크가 복사되었습니다.' });
    } catch (err) {
      logger.ui.error('요약 페이지 링크 복사 실패', err);
      addToast({ type: 'error', title: '링크 복사에 실패했습니다.' });
    }
  }, [summaryLink, addToast]);

  /**
   * 강의실 퇴장 처리
   *
   * 1. 서버에 퇴장 알림 전송
   *    - 강의자: 'break_room' -> 방 종료 (다른 참가자들에게 room-end 이벤트 발생)
   *    - 참여자: 'leave_room' -> 본인만 퇴장 (다른 참가자들에게 user-left 이벤트 발생)
   * 2. isRoomEnded 상태 초기화 (다른 방 입장 시 모달이 뜨지 않도록)
   * 3. 미디어 자원 정리 (Producer, Consumer, Transport 등)
   * 4. 페이지 이동 (replace: true -> 뒤로가기 시 방으로 돌아오지 않음)
   *    - 강의자: 요약 페이지로 이동
   *    - 참여자: 메인 페이지로 이동
   *
   * 서버 알림 실패해도 finally에서 정리 및 이동은 진행됨
   */
  const handleExit = useCallback(async () => {
    try {
      logger.ui.info('[ExitButton] 강의실 퇴장 시작');

      if (isPresenter) await SocketClient.emitWithAck('break_room');
      else await SocketClient.emitWithAck('leave_room');
    } catch (error) {
      logger.ui.error('[ExitButton] 서버 퇴장 알림 실패:', error);
    } finally {
      roomActions.setRoomEnded(false);
      await cleanupMedia();

      if (isPresenter) {
        // 강의자: 요약 페이지로 이동 (강의가 종료되었으므로 요약 페이지 접근 가능)
        navigate(ROUTES.ROOM_SUMMARY(roomId!), { replace: true });
      } else {
        // 참여자: 메인 페이지로 이동 (강의자가 아직 강의를 진행 중이므로 요약 페이지 접근 불가)
        navigate(ROUTES.HOME, { replace: true });
      }
    }
  }, [navigate, isPresenter, roomId, roomActions, cleanupMedia]);

  const handleConfirmExit = useCallback(async () => {
    setIsModalOpen(false);
    await handleExit();
  }, [handleExit]);

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      className="max-w-sm"
    >
      <Modal.Title>
        <span className="inline-block pt-3">
          {isPresenter ? '정말 강의를 종료하시겠어요?' : '정말 나가시겠어요?'}
        </span>
      </Modal.Title>
      <div className="mt-10 flex flex-col gap-3">
        <p className="text-primary text-sm font-bold">강의 요약 링크</p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-400 py-1 pr-1 pl-3 text-sm">
          <span className="text-text flex-1 truncate">{summaryLink}</span>
          <Button
            variant="icon"
            onClick={copySummaryLink}
          >
            <Icon
              name="copy"
              size={16}
            />
          </Button>
        </div>
        <p className="text-subtext-light text-xs">강의가 종료된 뒤에 확인하실 수 있습니다.</p>
      </div>

      <div className="mt-10 flex justify-end gap-2">
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
          {isPresenter ? '강의 종료' : '나가기'}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * 강의실 퇴장 버튼 컴포넌트
 *
 * 사용자가 직접 '나가기' 버튼을 클릭했을 때의 퇴장 처리
 *
 * ## RoomEndedModal과의 차이
 * - ExitButton: 사용자가 직접 나가기
 * - RoomEndedModal: 발표자가 방을 종료해서 강제 퇴장
 */
export function ExitButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <RoomButton
        icon="exit"
        tooltip="나가기"
        variant="ghost"
        onClick={() => setIsModalOpen(true)}
        className="text-error hover:bg-error/10"
      />
      <ExitConfirmModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
    </>
  );
}
