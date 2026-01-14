import { useState } from 'react';
import type { CreateRoomRequest, CreateRoomResponse } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

interface UseCreateRoomReturn {
  createRoom: (data: CreateRoomRequest) => Promise<CreateRoomResponse>;
  isSubmitting: boolean;
}

export function useCreateRoom(): UseCreateRoomReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRoom = async (data: CreateRoomRequest): Promise<CreateRoomResponse> => {
    setIsSubmitting(true);

    try {
      const response = await roomApi.createRoom(data);
      logger.api.info('강의실 생성 성공:', response.data);

      return response.data;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createRoom,
    isSubmitting,
  };
}
