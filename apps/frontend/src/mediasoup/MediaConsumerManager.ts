import { Consumer, Device, Transport } from 'mediasoup-client/types';

import { MediaSocket } from '@/feature/room/types';
import { logger } from '@/shared/lib/logger';
import { ConsumerSignaling } from './ConsumerSignaling';

/**
 * Consumer 인스턴스의 생성과 생명주기를 관리
 */
export class MediaConsumerManager {
  constructor(private socket: MediaSocket) {}

  /**
   * mediasoup Consumer 인스턴스 생성 및 활성화(Resume)
   */
  async create(device: Device, transport: Transport, remoteProducerId: string): Promise<Consumer> {
    const options = await ConsumerSignaling.consume(
      this.socket,
      transport.id,
      remoteProducerId,
      device.rtpCapabilities,
    );
    logger.media.info(`[Consumer] Consume 요청 성공: ${options.id}`);

    const consumer = await transport.consume(options);

    await ConsumerSignaling.resume(this.socket, consumer.id);
    logger.media.info(`[Consumer] Resume 성공: ${consumer.id}`);

    return consumer;
  }
}
