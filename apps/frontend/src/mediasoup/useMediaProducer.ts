import { useCallback, useRef } from 'react';
import { Producer, Transport } from 'mediasoup-client/types';
import { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '@/feature/room/types';

import { MediaProducerManager } from './MediaProducerManager';

/**
 * Producer 오류 메시지 매핑
 */
const ERROR_MESSAGES = {
  produceFailed: '미디어 송출에 실패했습니다.',
  invalidTrack: '유효하지 않은 미디어 트랙입니다.',
  transportClosed: '연결이 닫혀 있어 미디어를 보낼 수 없습니다.',
  unknown: '송출 중 알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * Producer 관련 오류 클래스
 */
export class ProducerError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;
    super(message);
    this.name = 'ProducerError';
    this.type = type;

    logger.ui.error('[Producer]', message);
  }
}

/**
 * 로컬 미디어 송출(Producer) 관리 훅
 */
export const useMediaProducer = () => {
  /**
   * Producer 인스턴스들을 관리 (중복 전송 방지 및 역할별 조회를 위해 Map 사용)
   */
  const producersRef = useRef<Map<MediaType, Producer>>(new Map());

  /**
   * 미디어 송출
   *
   * 1. 트랙 상태 검증
   * 2. Transport 상태 검증
   * 3. 중복 송출 방지 및 트랙 교체 로직 처리
   * 4. Producer 생성 및 이벤트 핸들러 설정
   */
  const produce = useCallback(
    async (
      transport: Transport,
      track: MediaStreamTrack,
      appData: { type: MediaType; [key: string]: unknown },
      socket: MediaSocket,
    ): Promise<Producer> => {
      const type = appData.type;

      // 트랙 상태 검증
      if (track.readyState !== 'live') {
        throw new ProducerError('invalidTrack');
      }

      // Transport 상태 검증
      if (transport.closed) {
        throw new ProducerError('transportClosed');
      }

      // 중복 송출 방지 및 트랙 교체 로직 처리
      const existing = producersRef.current.get(type);
      if (existing && !existing.closed) {
        const isSameTrack = existing.track?.id === track.id;
        if (isSameTrack) return existing;

        logger.media.info(`[Producer] ${type} 트랙을 교체`);
        await existing.replaceTrack({ track });
        return existing;
      }

      // Producer 생성 및 이벤트 핸들러 설정
      const manager = new MediaProducerManager(socket);
      try {
        const producer = await manager.create(transport, track, appData);

        const cleanup = (reason: string) => {
          producersRef.current.delete(type);
          logger.media.info(`[Producer] ${type} 자원 정리 완료: ${reason}`);
        };
        producer.on('transportclose', () => cleanup('transport 닫힘'));
        producer.on('trackended', () => cleanup('트랙 종료'));

        producersRef.current.set(type, producer);
        return producer;
      } catch {
        throw new ProducerError('produceFailed');
      }
    },
    [],
  );

  /**
   * 특정 미디어 타입 일시정지/재개
   * socket이 주입되면 서버에도 상태 변경을 알림
   */
  const togglePause = useCallback(async (type: MediaType, pause: boolean, socket: MediaSocket) => {
    const producer = producersRef.current.get(type);
    if (!producer) return;

    if (pause) producer.pause();
    else producer.resume();

    const manager = new MediaProducerManager(socket);
    await manager.requestToggle(producer.id, pause ? 'pause' : 'resume', type);
  }, []);

  /**
   * 특정 MediaType(video, audio, screen 등) 중단
   */
  const stopProducing = useCallback((type: MediaType) => {
    const producer = producersRef.current.get(type);

    if (producer) {
      producer.close();
      producersRef.current.delete(type);
      logger.media.info(`[Producer] ${type} 송출 중단`);
    }
  }, []);

  /**
   * 전체 송출 중단
   */
  const stopAllProducers = useCallback(() => {
    producersRef.current.forEach((producer) => producer.close());
    producersRef.current.clear();
    logger.media.info('[Producer] 모든 미디어 송출 중단');
  }, []);

  /**
   * 특정 타입의 Producer 인스턴스 반환
   */
  const getProducer = useCallback((type: MediaType = 'video'): Producer | null => {
    return producersRef.current.get(type) || null;
  }, []);

  return {
    produce,
    togglePause,
    stopProducing,
    stopAllProducers,
    getProducer,
  };
};
