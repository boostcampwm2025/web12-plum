import { DtlsParameters, RtpParameters, TransportOptions } from 'mediasoup-client/types';
import {
  BaseResponse,
  ConnectTransportResponse,
  CreateTransportResponse,
  MediaType,
  ProduceResponse,
} from '@plum/shared-interfaces';

import { MediaSocket } from '@/feature/room/types';

type TransportDirection = 'send' | 'recv';

/**
 * Transport 관련 순수 소켓 I/O 담당
 */
export const TransportSignaling = {
  /**
   * Transport 생성 파라미터 요청
   */
  createTransport: (socket: MediaSocket, direction: TransportDirection) => {
    const promise: Promise<TransportOptions> = new Promise((resolve, reject) => {
      const payload = { direction };
      const handleResponse = (response: CreateTransportResponse) => {
        if (response.success && 'id' in response) {
          const { success: _, ...options } = response;
          resolve(options);
        } else {
          reject(new Error(response.error || `${direction} Transport 파라미터 획득 실패`));
        }
      };

      socket.emit('create_transport', payload, handleResponse);
    });
    return promise;
  },

  /**
   * Transport 연결 (DTLS 파라미터 전달)
   */
  connectTransport: (socket: MediaSocket, transportId: string, dtlsParameters: DtlsParameters) => {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      const payload = { transportId, dtlsParameters };
      const handleResponse = (response: ConnectTransportResponse) => {
        if (response.success) resolve();
        else reject(new Error(response.error || 'Transport 연결 실패'));
      };

      socket.emit('connect_transport', payload, handleResponse);
    });
    return promise;
  },

  /**
   * Producer 생성 요청
   */
  produce: (
    socket: MediaSocket,
    transportId: string,
    type: MediaType,
    rtpParameters: RtpParameters,
  ) => {
    const promise: Promise<string> = new Promise((resolve, reject) => {
      const payload = { transportId, type, rtpParameters };
      const handleResponse = (response: ProduceResponse) => {
        if (response.success && 'producerId' in response) resolve(response.producerId);
        else reject(new Error((response as BaseResponse).error || 'Producer 생성 실패'));
      };

      socket.emit('produce', payload, handleResponse);
    });
    return promise;
  },
};
