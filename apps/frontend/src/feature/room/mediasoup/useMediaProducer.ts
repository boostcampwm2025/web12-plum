import { useCallback, useRef, useState } from 'react';
import { Producer, Transport } from 'mediasoup-client/types';
import { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { ProducerSignaling } from './ProducerSignaling';

/**
 * 로컬 미디어 트랙(카메라, 마이크, 화면)을 서버로 송출하는 Producer의 생명주기를 관리
 *
 * 복수의 송출 장치를 지원하기 위해 Map 구조로 인스턴스를 관리 (Key: appData.type)
 * 하드웨어 상태 변화(트랙 종료 등)와 서버 상태를 동기화
 */
export const useMediaProducer = () => {
  /**
   * Producer 인스턴스들을 관리 (중복 전송 방지 및 역할별 조회를 위해 Map 사용)
   * Key: 'video' | 'screen' | 'audio' 등 스트림의 용도
   */
  const producersRef = useRef<Map<MediaType, Producer>>(new Map());

  // UI 레이어에서 현재 어떤 미디어가 송출 중인지 파악할 수 있도록 상태 관리
  const [activeProducers, setActiveProducers] = useState({
    video: false,
    audio: false,
    screen: false,
  });

  /**
   * 현재 관리 중인 Producer 목록을 스캔하여 UI 상태를 동기화
   * Producer가 추가되거나 제거될 때마다 호출되어 전역적인 송출 상태를 최신화
   */
  const updateActiveState = useCallback(() => {
    const producers = Array.from(producersRef.current.values());
    setActiveProducers({
      video: producers.some((producer) => producer.kind === 'video'),
      audio: producers.some((producer) => producer.kind === 'audio'),
      screen: producers.some(
        (producer) => producer.kind === 'video' && producer.appData.type === 'screen',
      ),
    });
  }, []);

  /**
   * 미디어 송출
   *
   * 1. 트랙 상태 검증
   * 2. Transport 상태 검증
   * 3. 중복 송출 방지 및 트랙 교체 로직 처리
   * 4. Producer 생성 및 시그널링 핸들러 설정
   */
  const produce = useCallback(
    async (
      transport: Transport,
      track: MediaStreamTrack,
      appData: { type: MediaType; [key: string]: unknown },
    ): Promise<Producer> => {
      /**
       * 1. 트랙 상태 검증: 이미 종료되었거나 비활성화된 트랙은 전송할 수 없음
       */
      if (track.readyState !== 'live') {
        logger.media.error(`${track.kind} 트랙 상태가 유효하지 않음: ${track.readyState}`);
        throw new Error(`[Producer] 유효하지 않은 트랙 상태: ${track.readyState}`);
      }

      /**
       * 2. Transport 상태 검증
       */
      if (transport.closed) {
        logger.media.error('Transport가 이미 닫혀 있음');
        throw new Error('[Producer] Transport가 닫혀 있어 송출할 수 없습니다.');
      }

      const type = appData.type;

      /**
       * 3. 중복 송출 방지 및 트랙 교체 로직 처리
       */
      const existingProducer = producersRef.current.get(type);
      if (existingProducer && !existingProducer.closed) {
        if (existingProducer.track?.id === track.id) return existingProducer;

        logger.media.info(`[Producer] ${type} 트랙을 교체`);
        await existingProducer.replaceTrack({ track });
        return existingProducer;
      }

      /**
       * 4. Producer 생성 및 시그널링 핸들러 설정
       */
      const producer = await transport.produce({ track, appData });
      ProducerSignaling.setupAllHandlers(producer, () => {
        producersRef.current.delete(type);
        updateActiveState();
      });

      producersRef.current.set(type, producer);
      updateActiveState();
      return producer;
    },
    [updateActiveState],
  );

  /**
   * 특정 미디어 타입 일시정지/재개
   */
  const togglePause = useCallback((type: MediaType, pause: boolean) => {
    const producer = producersRef.current.get(type);
    if (!producer) return;

    if (pause) producer.pause();
    else producer.resume();

    logger.media.info(`[Producer] ${type} ${pause ? '일시정지' : '재개'}`);
  }, []);

  /**
   * 특정 MediaType(video, audio, screen 등) 중단
   * 사용자가 카메라나 마이크를 끌 때 해당 트랙의 송출을 중단하고 자원 정리
   */
  const stopProducing = useCallback(
    (type: MediaType) => {
      const producer = producersRef.current.get(type);

      if (producer) {
        producer.close();
        producersRef.current.delete(type);
        logger.media.info(`[MediaProducer] ${type} 송출 중단 및 자원 정리 완료`);
      }

      updateActiveState();
    },
    [updateActiveState],
  );

  /**
   * 전체 송출 중단
   * 강의실 퇴장 시 모든 미디어 스트림과 서버 연결을 일괄 정리
   */
  const stopAll = useCallback(() => {
    producersRef.current.forEach((producer) => producer.close());
    producersRef.current.clear();
    updateActiveState();
    logger.media.info('[Producer] 모든 미디어 송출이 중단되었음');
  }, [updateActiveState]);

  /**
   * 최신 Producer 인스턴스 반환
   * 특정 용도(video/screen/audio)의 Producer를 Key로 즉시 찾아 반환
   */
  const getProducer = useCallback((type: MediaType = 'video'): Producer | null => {
    return producersRef.current.get(type) || null;
  }, []);

  return {
    produce,
    togglePause,
    stopProducing,
    stopAll,
    activeProducers,
    getProducer,
    producerCount: producersRef.current.size,
  };
};
