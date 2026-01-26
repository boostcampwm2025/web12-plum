import { MediaType, ToggleActionType, ToggleMediaResponse } from '@plum/shared-interfaces';

import { MediaSocket } from '@/feature/room/types';

/**
 * Producer 관련 순수 소켓 I/O 담당
 */
export const ProducerSignaling = {
  /**
   * 미디어 상태 변경 요청 (pause/resume)
   */
  toggleMedia: (
    socket: MediaSocket,
    producerId: string,
    action: ToggleActionType,
    type: MediaType,
  ) => {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      const payload = { producerId, action, type };
      const handleResponse = (response: ToggleMediaResponse) => {
        if (response.success) resolve();
        else reject(new Error(response.error || `${type} ${action} 실패`));
      };

      socket.emit('toggle_media', payload, handleResponse);
    });
    return promise;
  },
};
