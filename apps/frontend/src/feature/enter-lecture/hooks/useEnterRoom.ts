import { useState } from 'react';
import type { EnterLectureRequestBody, EnterRoomResponse } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

interface UseEnterRoomReturn {
  enterRoom: (roomId: string, data: EnterLectureRequestBody) => Promise<EnterRoomResponse>;
  isSubmitting: boolean;
}

export function useEnterRoom(): UseEnterRoomReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enterRoom = async (
    roomId: string,
    data: EnterLectureRequestBody,
  ): Promise<EnterRoomResponse> => {
    setIsSubmitting(true);

    try {
      const response = await roomApi.joinRoom(roomId, data);
      logger.api.info('강의실 입장 성공:', response.data);
      return response.data;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    enterRoom,
    isSubmitting,
  };
}
