import type {
  CreateRoomResponse,
  EnterLectureRequestBody,
  EnterRoomResponse,
  NicknameValidationResponse,
  RoomValidationResponse,
} from '@plum/shared-interfaces';
import { createLectureSchema } from '@plum/shared-interfaces';
import type { z } from 'zod';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export type CreateRoomRequest = z.infer<typeof createLectureSchema>;

export const roomApi = {
  async createRoom(data: CreateRoomRequest): Promise<ApiResponse<CreateRoomResponse>> {
    const formData = new FormData();

    formData.append('name', data.name);
    formData.append('hostName', data.hostName);
    formData.append('isAgreed', String(data.isAgreed));

    formData.append('polls', JSON.stringify(data.polls));

    formData.append('qnas', JSON.stringify(data.qnas));

    if (data.presentationFiles && data.presentationFiles.length > 0) {
      data.presentationFiles.forEach((file) => {
        formData.append('presentationFiles', file);
      });
    }

    return apiClient.postFormData<CreateRoomResponse>('/room', formData);
  },

  async joinRoom(
    roomId: string,
    data: EnterLectureRequestBody,
  ): Promise<ApiResponse<EnterRoomResponse>> {
    return apiClient.post<EnterRoomResponse>(`/room/${roomId}/join`, data);
  },

  async validateRoom(roomId: string): Promise<ApiResponse<RoomValidationResponse>> {
    return apiClient.get<RoomValidationResponse>(`/room/${roomId}/validate`);
  },

  async validateNickname(
    roomId: string,
    nickname: string,
  ): Promise<ApiResponse<NicknameValidationResponse>> {
    const query = new URLSearchParams({ nickname });
    return apiClient.get<NicknameValidationResponse>(`/room/${roomId}/nickname/validate?${query}`);
  },
};
