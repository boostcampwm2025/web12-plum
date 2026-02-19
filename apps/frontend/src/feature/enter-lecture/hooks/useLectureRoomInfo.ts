import { useEffect, useState } from 'react';

import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

/**
 * 강의실 유효성을 검증하고 강의실 이름을 가져오는 훅
 *
 * - roomId를 기반으로 서버에 강의실 존재 여부를 확인
 * - 유효한 강의실이면 lectureName을 상태로 제공
 * - 유효하지 않으면 error 메시지를 상태로 제공 (리다이렉트/토스트는 호출 측에서 처리)
 * - cleanup 함수로 언마운트 시 이전 API 응답 무시 (isActive 패턴)
 */
export function useLectureRoomInfo(roomId: string | null) {
  const [lectureName, setLectureName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setLectureName('');
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    /**
     * roomId로 강의실 유효성 검증 API 호출
     *
     * - 성공 시 강의실 이름을 상태에 저장
     * - 실패 시 에러 메시지를 상태에 저장
     * - API 호출 중 컴포넌트가 언마운트되면 이후 응답을 무시하여 메모리 누수 및 상태 업데이트 방지
     * @returns
     */
    const fetch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await roomApi.validateRoom(roomId);
        if (!isActive) return;

        setLectureName(String(res.data.name));
        setIsLoading(false);
        setError(null);
      } catch (error) {
        if (!isActive) return;
        logger.api.error(`강의실 유효성 검증 실패: ${error}`);

        setLectureName('');
        setError('유효하지 않은 강의실입니다.');
        setIsLoading(false);
      }
    };

    fetch();

    return () => {
      isActive = false;
    };
  }, [roomId]);

  return {
    lectureName,
    isLoading,
    error,
  };
}
