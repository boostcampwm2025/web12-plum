import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/routes/routes';
import { Modal } from '@/shared/components/Modal';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { Button } from '@/shared/components/Button';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaCleanup } from '@/feature/media/hooks/useMediaCleanup';

/**
 * 강의 종료 후 요약 페이지로 리다이렉트까지의 지연 시간 (초)
 */
const REDIRECT_DELAY_SECONDS = 3;

/**
 * 강의 종료 모달 컴포넌트
 *
 * 발표자가 방을 종료하면 참가자에게 표시되는 모달
 *
 * ## 동작 흐름
 * 1. 서버에서 'room-end' 이벤트 수신 -> isRoomEnded = true
 * 2. 모달 표시 + 카운트다운 시작 (3초)
 * 3. 카운트다운 완료 시 요약 페이지로 이동 (replace: true)
 * 4. 언마운트 시 미디어 자원 정리
 *
 * ## 주의사항
 * - onClose는 빈 함수 (사용자가 모달을 닫을 수 없음)
 * - replace: true로 뒤로가기 시 방으로 돌아오지 않음
 */
export function RoomEndedModal() {
  const roomId = useSafeRoomId();
  const myInfo = useRoomStore((state) => state.myInfo);
  const navigate = useNavigate();
  const { cleanupMedia } = useMediaCleanup();

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const isRoomEnded = useRoomStore((state) => state.isRoomEnded);
  const roomActions = useRoomStore((state) => state.actions);

  /**
   * 요약 페이지로 즉시 이동
   *
   * 호출 시점:
   * - 카운트다운 완료 시 (자동)
   * - '바로 이동하기' 버튼 클릭 시 (수동)
   *
   * 실행 순서:
   * 1. isRoomEnded 상태 초기화 (다른 방 재입장 시 모달이 뜨지 않도록)
   * 2. 미디어 자원 정리 (Producer, Consumer, Transport 등)
   * 3. 요약 페이지로 이동 (replace: true -> 뒤로가기 시 방으로 돌아오지 않음)
   *
   * roomId가 없으면 early return (안전 장치)
   */
  const redirectToSummary = useCallback(async () => {
    if (!roomId) return;

    roomActions.setRoomEnded(false);
    await cleanupMedia();
    navigate(ROUTES.ROOM_SUMMARY(roomId), { replace: true });
  }, [roomId, navigate, roomActions, cleanupMedia]);

  /**
   * 카운트다운 및 리다이렉트 처리
   *
   * isRoomEnded가 true가 되면:
   * - 1초마다 countdown 감소
   * - 0이 되면 요약 페이지로 이동
   *
   * cleanup (언마운트 또는 isRoomEnded가 false가 될 때):
   * - isRoomEnded 상태 초기화 (재입장 시 모달이 다시 뜨지 않도록)
   * - 미디어 자원 정리 (Producer, Consumer, Transport 등)
   * - 타이머 정리
   */
  useEffect(() => {
    if (!isRoomEnded) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          redirectToSummary();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      roomActions.setRoomEnded(false);
      cleanupMedia();
      clearInterval(timer);
    };
  }, [isRoomEnded, navigate, roomId, roomActions, cleanupMedia]);

  if (myInfo?.role === 'presenter') return null;

  return (
    <Modal
      isOpen={isRoomEnded}
      onClose={() => {}}
      className="max-w-sm text-center"
    >
      <Modal.Title>강의가 종료되었습니다</Modal.Title>
      <div className="flex flex-col gap-3 pt-10">
        <p className="text-primary text-2xl font-bold">{countdown} 초 후</p>
        <p className="text-subtext-light text-lg font-bold">요약 페이지로 이동합니다.</p>
      </div>

      <Button
        onClick={redirectToSummary}
        className="mx-auto mt-10 mb-2 w-fit px-4 py-2"
      >
        바로 이동하기
      </Button>
    </Modal>
  );
}
