import { useCallback, useRef, useState } from 'react';
import { Consumer, Device, Transport } from 'mediasoup-client/types';
import { logger } from '@/shared/lib/logger';
import { ConsumerSignaling } from './ConsumerSignaling';
import { MediaSocket } from '../types';

/**
 * 상대방의 미디어(비디오/오디오)를 수신하는 Consumer의 생명주기를 관리
 * 서버와의 시그널링을 통해 동적으로 트랙을 생성하고 파괴하는 역할을 수행
 */
export const useMediaConsumer = () => {
  /**
   * 참여자들의 Consumer 인스턴스 관리 (Key: consumerId)
   */
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  // 스트림 객체 관리 (Video 태그에 바인딩용)
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  // UI 렌더링을 위해 관리 중인 Consumer ID 목록을 상태로 유지
  const [consumerIds, setConsumerIds] = useState<string[]>([]);

  /**
   * Consumer ID 목록 동기화
   */
  const syncConsumerIds = useCallback(() => {
    setConsumerIds(Array.from(consumersRef.current.keys()));
  }, []);

  /**
   * 미디어 수신 (Consume) 핵심 프로세스
   * 1. 사전 검증: Device가 로드되었는지 확인
   * 2. 서버에 파라미터 요청: Consume 요청 및 ConsumerOptions 획득
   * 3. 클라이언트 Consumer 생성
   * 4. 핸들러 바인딩 및 정리 로직 설정
   * 5. 서버에 Resume 요청
   * 6. 스트림 생성 및 상태 업데이트
   */
  const consume = useCallback(
    async (
      device: Device,
      socket: MediaSocket,
      transport: Transport,
      remoteProducerId: string,
      onCleanup?: (consumerId: string) => void,
    ) => {
      /**
       * 1. 사전 검증
       * Device가 로드되어야 내 브라우저가 수신 가능한 코덱 정보(rtpCapabilities)를 서버에 전달할 수 있음
       */
      if (!device?.loaded) {
        throw new Error('Mediasoup Device가 초기화되지 않았습니다.');
      }

      // 2. 서버에 파라미터 요청
      const options = await ConsumerSignaling.consume(socket, {
        transportId: transport.id,
        producerId: remoteProducerId,
        rtpCapabilities: device.rtpCapabilities,
      });

      // 3. 클라이언트 Consumer 생성
      const consumer = await transport.consume(options);

      // 4. 핸들러 바인딩 및 정리 로직
      const cleanup = () => {
        consumer.close();
        consumersRef.current.delete(consumer.id);
        streamsRef.current.delete(consumer.id);
        syncConsumerIds();
        onCleanup?.(consumer.id);
        logger.media.info(`[Consumer] 리소스 정리 완료: ${consumer.id}`);
      };
      ConsumerSignaling.setupAllHandlers(consumer, cleanup);

      // 5. 서버에 Resume 요청
      await ConsumerSignaling.consumeResume(socket, consumer.id);

      // 6. 스트림 생성 및 상태 업데이트
      const stream = new MediaStream([consumer.track]);
      consumersRef.current.set(consumer.id, consumer);
      streamsRef.current.set(consumer.id, stream);
      syncConsumerIds();

      return { consumer, stream };
    },
    [syncConsumerIds],
  );

  /**
   * 특정 Consumer 일시정지/재개
   */
  const toggleConsumer = useCallback((consumerId: string, pause: boolean) => {
    const consumer = consumersRef.current.get(consumerId);
    if (!consumer) return;

    if (pause) consumer.pause();
    else consumer.resume();
  }, []);

  /**
   * 특정 Consumer 자원 정리
   * 수신 중단 시 네이티브 트랙을 멈추고 메모리 참조를 해제하여 리소스 누수 방지
   */
  const removeConsumer = useCallback(
    (consumerId: string) => {
      const consumer = consumersRef.current.get(consumerId);
      if (consumer) {
        consumer.close();
        consumersRef.current.delete(consumerId);
        streamsRef.current.delete(consumerId);
        syncConsumerIds();
        logger.media.info(`[Consumer] 리소스 제거 완료: ${consumerId}`);
      }
    },
    [syncConsumerIds],
  );

  /**
   * 모든 Consumer 정리
   */
  const removeAll = useCallback(() => {
    consumersRef.current.forEach((consumer) => consumer.close());
    consumersRef.current.clear();
    streamsRef.current.clear();
    syncConsumerIds();
    logger.media.info('[Consumer] 모든 Consumer가 정리되었음');
  }, [syncConsumerIds]);

  /**
   * 현재 활성화된 Consumers 반환
   */
  const getConsumers = useCallback(() => consumersRef.current, []);

  /**
   * 특정 스트림 반환
   */
  const getStream = useCallback((id: string) => streamsRef.current.get(id), []);

  return {
    consume,
    removeConsumer,
    getConsumers,
    consumerIds,
    getStream,
    toggleConsumer,
    removeAll,
  };
};
