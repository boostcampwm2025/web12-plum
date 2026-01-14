import { useState } from 'react';
import type { CreateRoomRequest, CreateRoomResponse, ErrorResponse } from '@plum/shared-interfaces';
import { roomApi } from '@/shared/api';

type CreateRoomSuccessResponse = Exclude<CreateRoomResponse, ErrorResponse>;

interface UseCreateRoomReturn {
  createRoom: (data: CreateRoomRequest) => Promise<CreateRoomSuccessResponse>;
  isSubmitting: boolean;
}

export function useCreateRoom(): UseCreateRoomReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRoom = async (data: CreateRoomRequest): Promise<CreateRoomSuccessResponse> => {
    setIsSubmitting(true);

    try {
      const response = await roomApi.createRoom(data);
      if ('statusCode' in response.data) {
        throw new Error(response.data.message || '강의실 생성 중 오류가 발생했습니다.');
      }
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
