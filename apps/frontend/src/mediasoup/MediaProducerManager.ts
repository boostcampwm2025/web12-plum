import { Transport } from 'mediasoup-client/types';
import { MediaType, ToggleActionType } from '@plum/shared-interfaces';

import { MediaSocket } from '@/feature/room/types';
import { logger } from '@/shared/lib/logger';
import { ProducerSignaling } from './ProducerSignaling';

/**
 * Producer 인스턴스의 생성과 생명주기를 관리
 */
export class MediaProducerManager {
  constructor(private socket: MediaSocket) {}

  /**
   * mediasoup Producer 인스턴스 생성
   * (내부적으로 transport의 'produce' 이벤트가 발생하여 TransportSignaling.produce 호출됨)
   */
  async create(
    transport: Transport,
    track: MediaStreamTrack,
    appData: { type: MediaType; [key: string]: unknown },
  ) {
    const producer = await transport.produce({ track, appData });
    return producer;
  }

  /**
   * 미디어 상태 변경 요청 (pause/resume)
   */
  async requestToggle(producerId: string, action: ToggleActionType, type: MediaType) {
    await ProducerSignaling.toggleMedia(this.socket, producerId, action, type);
    logger.media.info(`[Producer] ${type} ${action} 성공`);
  }
}
