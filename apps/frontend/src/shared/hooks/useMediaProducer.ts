import { useCallback, useRef, useState } from 'react';
import { Producer } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';
import { logger } from '@/shared/lib/logger';
import { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { useMediaTransport } from './useMediaTransport';

/**
 * 로컬 미디어 트랙(카메라, 마이크, 화면)을 서버로 송출하는 Producer의 생명주기를 관리
 *
 * 복수의 송출 장치를 지원하기 위해 Map 구조로 인스턴스를 관리 (Key: appData.type)
 * 하드웨어 상태 변화(트랙 종료 등)와 서버 상태를 동기화
 */
export const useMediaProducer = () => {
  const { createTransport, getSendTransport } = useMediaTransport();

  /**
   * Producer 인스턴스들을 관리 (중복 전송 방지 및 역할별 조회를 위해 Map 사용)
   * Key: 'camera' | 'screen' | 'mic' 등 스트림의 용도
   */
  const producersRef = useRef<Map<string, Producer>>(new Map());

  // UI 레이어에서 현재 어떤 미디어가 송출 중인지 파악할 수 있도록 상태 관리
  const [activeProducers, setActiveProducers] = useState<{ video: boolean; audio: boolean }>({
    video: false,
    audio: false,
  });

  /**
   * 현재 관리 중인 Producer 목록을 스캔하여 UI 상태를 동기화
   * Producer가 추가되거나 제거될 때마다 호출되어 전역적인 송출 상태를 최신화
   */
  const updateActiveState = useCallback(() => {
    const producers = Array.from(producersRef.current.values());
    const hasVideo = producers.some((producer) => producer.kind === 'video');
    const hasAudio = producers.some((producer) => producer.kind === 'audio');
    setActiveProducers({ video: hasVideo, audio: hasAudio });
  }, []);

  /**
   * 내부 자원 정리
   * Producer가 닫힐 때 관련된 이벤트 리스너를 제거하고 메모리 참조를 해제
   */
  const cleanupProducer = useCallback(
    (producer: Producer) => {
      const type = producer.appData.type as string;
      producer.close();
      producersRef.current.delete(type);
      updateActiveState();
    },
    [updateActiveState],
  );

  /**
   * 미디어 송출
   *
   * 1. 트랙의 ReadyState를 검증하여 에러를 미연에 방지
   * 2. 유효한 Send Transport를 확보(필요 시 생성)
   * 3. 서버에 Produce 요청을 보내고 응답받은 ID로 Producer 인스턴스를 생성
   * 4. 트랙 종료나 전송로 단절 등 예외 상황에 대비한 핸들러를 바인딩
   */
  const produce = useCallback(
    async (
      socket: Socket<ServerToClientEvents, ClientToServerEvents>,
      track: MediaStreamTrack,
      appData: Record<string, unknown> = {},
    ): Promise<Producer> => {
      /**
       * 트랙 상태 검증: 이미 종료되었거나 비활성화된 트랙은 전송할 수 없음
       */
      if (track.readyState !== 'live') {
        logger.media.error(`${track.kind} 트랙 상태가 유효하지 않음: ${track.readyState}`);
        throw new Error(`[Producer] 유효하지 않은 트랙 상태: ${track.readyState}`);
      }

      const type = (appData.type as string) || 'camera';

      /**
       * 동일한 타입(용도)의 Producer가 이미 존재하는지 체크
       */
      const existing = producersRef.current.get(type);
      if (existing) {
        // 만약 트랙 ID까지 같다면 기존 것 반환, 다르다면 기존 것을 닫고 새로 만들거나 에러 처리 가능
        if (existing.track?.id === track.id) {
          logger.media.warn(`[Producer] ${type} 타입의 동일 트랙이 이미 송출 중입니다.`);
          return existing;
        }
        logger.media.info(`[Producer] 기존 ${type} 송출을 교체합니다.`);
        cleanupProducer(existing);
      }

      try {
        // 기존 송출용 Transport를 재사용하거나 새로 생성
        let transport = getSendTransport();
        if (!transport || transport.closed) {
          transport = await createTransport(socket, 'send');
        }

        /**
         * 서버 송출 시작
         * appData를 통해 서버가 이 스트림이 'camera'인지 'screen'인지 명확히 구분하게 함
         */
        const producer = await transport.produce({
          track,
          appData: {
            type,
            ...appData,
          },
        });

        /**
         * 이벤트 핸들러 바인딩
         * 하드웨어 장치 해제(trackended)나 네트워크 단절 시 즉시 자원을 반환
         */
        producer.on('transportclose', () => {
          logger.media.warn(`[Producer] transport 단절로 인한 종료: ${producer.id}`);
          cleanupProducer(producer);
        });

        producer.on('trackended', () => {
          logger.media.warn(`[Producer] 하드웨어 트랙 종료: ${producer.id}`);
          cleanupProducer(producer);
        });

        producersRef.current.set(type, producer);
        updateActiveState();

        logger.media.info(`Producer 송출 시작: ${track.kind} (Type: ${type})`);
        return producer;
      } catch (error) {
        logger.media.error(`Producer 생성 실패 (${track.kind}):`, error);
        throw error;
      }
    },
    [createTransport, getSendTransport, cleanupProducer, updateActiveState],
  );

  /**
   * 특정 미디어 타입 중단
   * 'video'나 'audio' 타입을 지정하여 해당되는 모든 송출을 중단
   */
  const stopProducing = useCallback(
    (kind: 'video' | 'audio') => {
      producersRef.current.forEach((producer) => {
        if (producer.kind === kind) {
          cleanupProducer(producer);
        }
      });
    },
    [cleanupProducer],
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
   * 특정 용도(camera/screen/mic)의 Producer를 Key로 즉시 찾아 반환
   */
  const getProducer = useCallback((type: string = 'camera'): Producer | null => {
    return producersRef.current.get(type) || null;
  }, []);

  return {
    produce,
    stopProducing,
    stopAll,
    activeProducers,
    getProducer,
    producerCount: producersRef.current.size,
  };
};
