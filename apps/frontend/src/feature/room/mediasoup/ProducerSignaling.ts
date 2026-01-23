import { logger } from '@/shared/lib/logger';
import { Producer } from 'mediasoup-client/types';
import { MediaType, ToggleActionType, ToggleMediaResponse } from '@plum/shared-interfaces';
import { MediaSocket } from '../types';

/**
 * Mediasoup Producer 관련 시그널링 처리를 담당하는 모듈
 */
export const ProducerSignaling = {
  /**
   * 서버에 미디어 상태 변경(pause/resume) 알림
   */
  toggleMedia: (
    socket: MediaSocket,
    producerId: string,
    action: ToggleActionType,
    type: MediaType,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const payload = { producerId, action, type };

      const handleResponse = (response: ToggleMediaResponse) => {
        if (response.success) {
          logger.media.info(`[Producer] ${type} ${action} 성공`);
          resolve();
        } else {
          logger.media.error(`[Producer] ${type} ${action} 실패:`, response.error);
          reject(new Error(response.error || 'toggle_media 실패'));
        }
      };

      socket.emit('toggle_media', payload, handleResponse);
    });
  },

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
