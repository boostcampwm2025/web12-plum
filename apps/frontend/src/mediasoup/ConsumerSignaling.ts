import { ConsumerOptions, RtpCapabilities } from 'mediasoup-client/types';
import { BaseResponse, ConsumeResponse } from '@plum/shared-interfaces';

import { MediaSocket } from '@/feature/room/types';

/**
 * Consumer 관련 순수 소켓 I/O 담당
 */
export const ConsumerSignaling = {
  /**
   * Consume 파라미터 요청
   */
  consume: (
    socket: MediaSocket,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<ConsumerOptions & { producerPaused: boolean }> => {
    const promise: Promise<ConsumerOptions & { producerPaused: boolean }> = new Promise(
      (resolve, reject) => {
        const payload = { transportId, producerId, rtpCapabilities };
        const handleResponse = (response: ConsumeResponse) => {
          if (response.success && 'consumerId' in response) {
            const { success: _, consumerId, producerPaused, ...options } = response;
            resolve({ id: consumerId, producerPaused, ...options });
          } else {
            reject(new Error((response as BaseResponse).error || 'Consume 요청 실패'));
          }
        };

        socket.emit('consume', payload, handleResponse);
      },
    );
    return promise;
  },

  /**
   * Consumer Resume 요청
   */
  resume: (socket: MediaSocket, consumerId: string) => {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      const payload = { consumerId };
      const handleResponse = (response: BaseResponse) => {
        if (response.success) resolve();
        else reject(new Error(response.error || 'Resume 실패'));
      };

      socket.emit('consume_resume', payload, handleResponse);
    });
    return promise;
  },

  close: (socket: MediaSocket, consumerId: string) => {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      const payload = { consumerId };
      const handleResponse = (response: BaseResponse) => {
        if (response.success) resolve();
        else reject(new Error(response.error || 'Close 실패'));
      };

      socket.emit('close_consumer', payload, handleResponse);
    });
    return promise;
  },
};
