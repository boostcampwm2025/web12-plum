import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Modal } from '@/shared/components/Modal';
import { useRoomStore } from '../stores/useRoomStore';
import { ROUTES } from '@/app/routes/routes';

/**
 * 강의 종료 후 메인페이지로 리다이렉트까지의 지연 시간 (초)
 */
const REDIRECT_DELAY_SECONDS = 3;

/**
 * 강의 종료 모달 컴포넌트
 * 강의자가 나가서 강의가 종료되면 모달을 표시하고 3초 후 메인페이지로 이동
 */
export function RoomEndedModal() {
  const navigate = useNavigate();
  const isRoomEnded = useRoomStore((state) => state.isRoomEnded);

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);

  useEffect(() => {
    if (!isRoomEnded) return;

    // 카운트다운 시작
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      navigate(ROUTES.HOME, { replace: true });
    }, REDIRECT_DELAY_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRoomEnded, navigate]);

  return (
    <Modal
      isOpen={isRoomEnded}
      onClose={() => {}}
      className="max-w-sm text-center"
    >
      <Modal.Title>강의가 종료되었습니다</Modal.Title>
      <div className="flex flex-col gap-3 py-15">
        <p className="text-primary text-2xl font-bold">{countdown} 초 후</p>
        <p className="text-subtext-light text-lg font-bold">메인 페이지로 이동합니다.</p>
      </div>
    </Modal>
  );
}
