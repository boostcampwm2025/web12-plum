import { Device, Transport } from 'mediasoup-client/types';
import { MediaType } from '@plum/shared-interfaces';

import { MediaSocket } from '@/feature/room/types';
import { logger } from '@/shared/lib/logger';
import { TransportSignaling } from './TransportSignaling';

type TransportDirection = 'send' | 'recv';

/**
 * Transport 인스턴스의 생성과 생명주기를 관리
 */
export class MediaTransportManager {
  constructor(
    private socket: MediaSocket,
    private direction: TransportDirection,
  ) {}

  /**
   * mediasoup Transport 인스턴스 생성 및 초기화
   */
  async create(device: Device): Promise<Transport> {
    // 서버에 Transport 파라미터 요청
    const options = await TransportSignaling.createTransport(this.socket, this.direction);

    // 인스턴스 생성
    const isSender = this.direction === 'send';
    const transport = isSender
      ? device.createSendTransport(options)
      : device.createRecvTransport(options);

    this.bindEvents(transport);

    return transport;
  }

  /**
   * Transport 이벤트 바인딩
   */
  private bindEvents(transport: Transport) {
    // connect 이벤트: DTLS 파라미터를 서버에 전달
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await TransportSignaling.connectTransport(this.socket, transport.id, dtlsParameters);
        logger.media.info(`[Transport] ${this.direction} 연결 성공`);
        callback();
      } catch (error) {
        logger.media.error(`[Transport] ${this.direction} 연결 실패:`, error);
        errback(error as Error);
      }
    });

    // produce 이벤트: Send Transport 전용
    if (this.direction === 'send') {
      transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        const type = (appData?.type as MediaType) || kind;

        try {
          const producerId = await TransportSignaling.produce(
            this.socket,
            transport.id,
            type,
            rtpParameters,
          );
          logger.media.info(`[Transport] Producer 생성 완료: ${producerId}`);
          callback({ id: producerId });
        } catch (error) {
          logger.media.error(`[Transport] Producer 생성 실패:`, error);
          errback(error as Error);
        }
      });
    }
  }
}
