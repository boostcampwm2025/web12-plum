import { createLectureSchema, type CreateRoomResponse } from '@plum/shared-interfaces';
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
};
