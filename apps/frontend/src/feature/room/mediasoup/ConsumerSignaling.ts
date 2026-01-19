import { Consumer, ConsumerOptions } from 'mediasoup-client/types';
import {
  BaseResponse,
  ConsumeRequest,
  ConsumeResponse,
  ConsumeResumeResponse,
} from '@plum/shared-interfaces';

import { MediaSocket } from '../types';

/**
 * Mediasoup Consumer 관련 시그널링 처리를 담당하는 모듈
 */
export const ConsumerSignaling = {
  /**
   * 서버에 Consume 요청 및 파라미터 획득
   * 서버에 특정 Producer의 미디어를 수신(Consume)하기 위한 요청을 보내고,
   * 해당 미디어를 수신하는 데 필요한 ConsumerOptions를 받아옴
   */
  consume: async (socket: MediaSocket, params: ConsumeRequest) => {
    const promise = new Promise<ConsumerOptions>((resolve, reject) => {
      const handleResponse = (response: ConsumeResponse) => {
        if (response.success && 'consumerId' in response) {
          const options: ConsumerOptions = {
            id: response.consumerId,
            producerId: response.producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters,
          };
          resolve(options);
        } else {
          const typedResponse = response as BaseResponse;
          reject(new Error(typedResponse.error || 'Consume 요청 실패'));
        }
      };

      socket.emit('consume', params, handleResponse);
    });

    return promise;
  },

  /**
   * 서버에 Resume 요청
   * Consumer가 일시정지 상태일 때 미디어 흐름을 재개
   */
  consumeResume: async (socket: MediaSocket, consumerId: string) => {
    const promise = new Promise<void>((resolve, reject) => {
      const params = { consumerId };

      const handleResponse = (response: ConsumeResumeResponse) => {
        if (response.success) {
          resolve();
        } else {
          const errorMessage = response.error || 'Resume 실패';
          reject(new Error(errorMessage));
        }
      };

      socket.emit('consume_resume', params, handleResponse);
    });

    return promise;
  },

  /**
   * 모든 시그널링 핸들러를 한 번에 설정
   */
  setupAllHandlers: (consumer: Consumer, onCleanup: () => void) => {
    consumer.on('transportclose', onCleanup);
    consumer.on('@close', onCleanup);
    consumer.on('trackended', onCleanup);
  },
};
