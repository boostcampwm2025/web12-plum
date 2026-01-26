import { useState } from 'react';
import type { CreateRoomRequest, CreateRoomResponse } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';

interface UseCreateRoomReturn {
  createRoom: (data: CreateRoomRequest) => Promise<CreateRoomResponse>;
  isSubmitting: boolean;
}

/**
 * 강의실 생성 훅
 * - 강의실 생성 API 호출
 * - 제출 상태 관리
 */
export function useCreateRoom(): UseCreateRoomReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setMyInfo, setRoomTitle } = useRoomStore((state) => state.actions);

  /**
   * 강의실 생성 처리
   */
  const createRoom = async (data: CreateRoomRequest) => {
    setIsSubmitting(true);

    try {
      const response = await roomApi.createRoom(data);
      logger.api.info('강의실 생성 성공:', response.data);

      const roomData = response.data;
      setMyInfo(roomData.host);
      setRoomTitle(data.name);
      return roomData;
    } catch (error) {
      logger.api.error(`강의실 생성 실패: ${error}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createRoom,
    isSubmitting,
  };
}
