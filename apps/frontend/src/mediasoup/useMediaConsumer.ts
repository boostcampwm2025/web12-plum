import { useCallback, useRef } from 'react';
import { Consumer, Device, Transport } from 'mediasoup-client/types';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '@/feature/room/types';

import { MediaConsumerManager } from './MediaConsumerManager';

/**
 * Consumer 오류 메시지 매핑
 */
const ERROR_MESSAGES = {
  consumeFailed: '상대방의 미디어를 불러오는데 실패했습니다.',
  unknown: '미디어 수신 중 알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * Consumer 관련 오류 클래스
 */
export class ConsumerError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;
    super(message);
    this.name = 'ConsumerError';
    this.type = type;

    logger.ui.error('[Consumer]', message);
  }
}

/**
 * 상대방 미디어 수신 관리
 */
export const useMediaConsumer = () => {
  /**
   * 참여자들의 Consumer 인스턴스 관리 (Key: consumerId)
   */
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  /**
   * 스트림 객체 관리 (Video 태그에 바인딩용)
   */
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  /**
   * 미디어 수신 (Consume) 핵심 프로세스
   *
   * 1. 서버에 파라미터 요청 및 클라이언트 Consumer 생성
   * 2. 핸들러 바인딩 및 정리 로직 설정
   * 3. 스트림 생성 및 상태 업데이트
   */
  const consume = useCallback(
    async (
      device: Device,
      socket: MediaSocket,
      transport: Transport,
      remoteProducerId: string,
      onCleanup?: (consumerId: string) => void,
    ): Promise<{ consumer: Consumer; stream: MediaStream }> => {
      try {
        // 1. 서버에 파라미터 요청 및 클라이언트 Consumer 생성
        const manager = new MediaConsumerManager(socket);
        const consumer = await manager.create(device, transport, remoteProducerId);

        // 2. 핸들러 바인딩 및 정리 로직 설정
        const handleCleanup = (reason: string) => {
          removeConsumer(consumer.id);
          onCleanup?.(consumer.id);
          logger.media.info(`[Consumer] 리소스 정리 완료: ${reason} ${consumer.id}`);
        };

        consumer.once('transportclose', () => handleCleanup('transport 닫힘'));
        consumer.once('trackended', () => handleCleanup('트랙 종료'));

        // 3. 스트림 생성 및 상태 업데이트
        const stream = new MediaStream([consumer.track]);
        consumersRef.current.set(consumer.id, consumer);
        streamsRef.current.set(consumer.id, stream);

        logger.media.info(`[Consumer] 미디어 수신 시작: ${consumer.id}`);
        return { consumer, stream };
      } catch {
        throw new ConsumerError('consumeFailed');
      }
    },
    [],
  );

  /**
   * 특정 Consumer 일시정지/재개
   */
  const toggleConsumer = useCallback((consumerId: string, pause: boolean) => {
    const consumer = consumersRef.current.get(consumerId);
    if (!consumer) return;

    if (pause) consumer.pause();
    else consumer.resume();

    logger.media.info(`[Consumer] ${consumerId} ${pause ? '일시정지' : '재개'}`);
  }, []);

  /**
   * 특정 Consumer 자원 정리
   */
  const removeConsumer = useCallback((consumerId: string) => {
    const consumer = consumersRef.current.get(consumerId);
    if (consumer) {
      consumer.close();
      consumersRef.current.delete(consumerId);
      streamsRef.current.delete(consumerId);
      logger.media.info(`[Consumer] 리소스 제거 완료: ${consumerId}`);
    }
  }, []);

  /**
   * 모든 Consumer 정리
   */
  const removeAllConsumers = useCallback(() => {
    consumersRef.current.forEach((consumer) => consumer.close());
    consumersRef.current.clear();
    streamsRef.current.clear();
    logger.media.info('[Consumer] 모든 Consumer 정리 완료');
  }, []);

  return {
    consume,
    removeConsumer,
    toggleConsumer,
    removeAllConsumers,
  };
};
