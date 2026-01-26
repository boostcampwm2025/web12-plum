import { JoinRoomResponse } from '@plum/shared-interfaces';

import { MediaSocket } from '../types';

/**
 * 방 입장/퇴장 관련 시그널링 유틸리티
 */
export const RoomSignaling = {
  /**
   * 방 입장 요청
   */
  joinRoom: (socket: MediaSocket, roomId: string, participantId: string) => {
    const promise: Promise<JoinRoomResponse> = new Promise((resolve) => {
      const payload = { roomId, participantId };
      const handleResponse = (response: JoinRoomResponse) => {
        resolve(response);
      };

      socket.emit('join_room', payload, handleResponse);
    });
    return promise;
  },

  /**
   * 방 퇴장 알림
   */
  leaveRoom: (socket: MediaSocket) => {
    const promise: Promise<void> = new Promise((resolve) => {
      const handleResponse = () => {
        resolve();
      };

      socket.emit('leave_room', handleResponse);
    });
    return promise;
  },
};
