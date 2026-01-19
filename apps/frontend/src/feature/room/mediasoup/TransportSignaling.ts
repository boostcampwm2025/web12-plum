import { Transport, TransportOptions } from 'mediasoup-client/types';
import {
  BaseResponse,
  ConnectTransportResponse,
  CreateTransportResponse,
  MediaType,
  ProduceRequest,
  ProduceResponse,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '../types';

/**
 * Mediasoup Transport 관련 시그널링 처리를 담당하는 모듈
 */
export const TransportSignaling = {
  /**
   * 서버에 Transport 생성을 요청하고 파라미터를 받아옴
   */
  createTransport: (socket: MediaSocket, direction: 'send' | 'recv') => {
    const promise = new Promise<TransportOptions>((resolve, reject) => {
      const payload = { direction };

      const handleResponse = (response: CreateTransportResponse) => {
        if (response.success && 'id' in response) {
          const options: TransportOptions = {
            id: response.id,
            iceParameters: response.iceParameters,
            iceCandidates: response.iceCandidates,
            dtlsParameters: response.dtlsParameters,
          };

          resolve(options);
        } else {
          const typedResponse = response as BaseResponse;
          reject(new Error(typedResponse.error || 'Transport 생성 실패'));
        }
      };

      socket.emit('create_transport', payload, handleResponse);
    });

    return promise;
  },

  /**
   * DTLS 파라미터를 서버에 전달하여 연결을 확립
   */
  connectTransport: (transport: Transport, socket: MediaSocket) => {
    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      logger.media.debug(`[Transport] 서버와 연결 시도`);

      const payload = { transportId: transport.id, dtlsParameters };

      const handleResponse = (response: ConnectTransportResponse) => {
        if (response.success) {
          logger.media.info(`[Transport] 연결 성공: ${transport.id}`);
          callback();
        } else {
          logger.media.error(`[Transport] 연결 실패:`, response.error);
          errback(new Error(response.error));
        }
      };

      socket.emit('connect_transport', payload, handleResponse);
    });
  },

  /**
   * Producer 생성을 위한 시그널링을 처리 (Send Transport 전용)
   */
  produce: (transport: Transport, socket: MediaSocket) => {
    transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      logger.media.debug(`[Producer] 생성 시도: ${kind}`);

      const payload: ProduceRequest = {
        transportId: transport.id,
        type: (appData?.type as MediaType) || kind,
        rtpParameters,
      };

      const handleResponse = (response: ProduceResponse) => {
        if (response.success && 'producerId' in response) {
          logger.media.info(`[Producer] 생성 완료: ${response.producerId}`);
          callback({ id: response.producerId });
        } else {
          const typedResponse = response as BaseResponse;
          logger.media.error(`[Producer] 생성 실패:`, typedResponse.error);
          errback(new Error(typedResponse.error));
        }
      };

      socket.emit('produce', payload, handleResponse);
    });
  },

  /**
   * 연결 상태 변화를 감지하고 로그 및 정리를 수행합니다.
   */
  connectionStateChange: (
    transport: Transport,
    direction: 'send' | 'recv',
    cleanupCallback: () => void,
  ) => {
    transport.on('connectionstatechange', (state) => {
      logger.media.info(`[${direction}] 상태 변경: ${state}`);

      if (state === 'failed' || state === 'closed') cleanupCallback();
    });
  },

  /**
   * 모든 시그널링 핸들러를 한 번에 설정
   */
  setupAllHandlers: (
    transport: Transport,
    socket: MediaSocket,
    direction: 'send' | 'recv',
    onFailed: () => void,
  ) => {
    // DTLS 파라미터 전송 핸들러 설정
    TransportSignaling.connectTransport(transport, socket);

    // Send Transport인 경우 Producer 생성 핸들러 설정
    if (direction === 'send') TransportSignaling.produce(transport, socket);

    // 연결 상태 변화 핸들러 설정
    TransportSignaling.connectionStateChange(transport, direction, onFailed);
  },
};
