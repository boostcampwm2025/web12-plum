import { logger } from '@/shared/lib/logger';
import { Producer } from 'mediasoup-client/types';

/**
 * Mediasoup Producer 관련 시그널링 처리를 담당하는 모듈
 */
export const ProducerSignaling = {
  /**
   * 모든 시그널링 핸들러를 한 번에 설정
   */
  setupAllHandlers: (producer: Producer, onCleanup: () => void) => {
    /**
     * 트랙 종료 및 transport 단절 핸들러 설정
     */
    producer.on('transportclose', () => {
      logger.media.warn(`[Producer] transport 단절: ${producer.id}`);
      onCleanup();
    });

    /**
     * 트랙 종료 핸들러 설정
     */
    producer.on('trackended', () => {
      logger.media.warn(`[Producer] 트랙 종료: ${producer.id}`);
      onCleanup();
    });
  },
};
