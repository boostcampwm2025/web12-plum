import { useCallback, useRef, useState } from 'react';
import { Consumer, ConsumerOptions } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';
import { logger } from '@/shared/lib/logger';
import { BaseResponse, ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { useMediaTransport } from './useMediaTransport';

/**
 * 상대방의 미디어(비디오/오디오)를 수신하는 Consumer의 생명주기를 관리
 * 서버와의 시그널링을 통해 동적으로 트랙을 생성하고 파괴하는 역할을 수행
 */
export const useMediaConsumer = () => {
  const { createTransport, getRecvTransport } = useMediaTransport();
  // 내 디바이스의 RTP 수신 성능 정보를 서버에 전달하기 위해 스토어 참조
  const device = useMediaDeviceStore((state) => state.device);

  /**
   * 참여자들의 Consumer 인스턴스 관리 (Key: consumerId)
   */
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  // UI 렌더링을 위해 관리 중인 Consumer ID 목록을 상태로 유지
  const [consumerIds, setConsumerIds] = useState<string[]>([]);

  /**
   * 특정 Consumer 자원 정리
   * * 수신 중단 시 네이티브 트랙을 멈추고 메모리 참조를 해제하여 리소스 누수 방지
   */
  const removeConsumer = useCallback((consumerId: string) => {
    const consumer = consumersRef.current.get(consumerId);
    if (consumer) {
      consumer.close(); // 네이티브 미디어 트랙 정지 및 서버 연결 해제
      consumersRef.current.delete(consumerId);
      setConsumerIds(Array.from(consumersRef.current.keys()));
      logger.media.info(`[Consumer] 리소스 제거 완료: ${consumerId}`);
    }
  }, []);

  /**
   * 미디어 수신 (Consume) 핵심 프로세스
   * * 1. 사전 검증: Device 로드 여부 확인 (RTP Capabilities 필요)
   * 2. 수신용 통로(Recv Transport) 확보 및 재사용
   * 3. 서버에 'consume' 요청을 보내 미디어 수신 파라미터 획득
   * 4. 클라이언트 측 Consumer 생성 및 이벤트 핸들러 바인딩
   * 5. 서버에 'resume_consumer' 요청을 보내 실제 패킷 전송 시작
   */
  const consume = useCallback(
    async (
      socket: Socket<ServerToClientEvents, ClientToServerEvents>,
      remoteProducerId: string,
    ) => {
      try {
        /**
         * 사전 검증
         * Device가 로드되어야 내 브라우저가 수신 가능한 코덱 정보(rtpCapabilities)를 서버에 전달할 수 있음
         */
        if (!device) {
          throw new Error('Mediasoup Device가 초기화되지 않았습니다.');
        }

        /**
         * 수신용 통로 확보
         * 기존에 생성된 Receive Transport가 있다면 재사용하고, 없다면 새로 생성
         */
        let transport = getRecvTransport();
        if (!transport || transport.closed) {
          logger.media.info('[Consumer] 수신용 Transport가 없거나 닫혀 있어 새로 생성');
          transport = await createTransport(socket, 'recv');
        }

        /**
         * 서버에 Consume 요청
         * 특정 Producer의 미디어를 수신하기 위해 내 RTP 성능 정보를 함께 전달
         * 서버는 이 정보를 바탕으로 브라우저 호환성에 맞는 수신 파라미터를 생성하여 응답
         */
        const consumerParams = await new Promise<ConsumerOptions>((resolve, reject) => {
          socket.emit(
            'consume',
            {
              transportId: transport.id,
              producerId: remoteProducerId,
              rtpCapabilities: device.rtpCapabilities,
            },
            (response) => {
              if (!response.success || !('consumerId' in response)) {
                const errorResponse = response as BaseResponse;
                const errorMessage = errorResponse.error || 'Consume 요청 실패';
                return reject(new Error(errorMessage));
              }

              /**
               * 성공 응답일 경우 mediasoup-client의 consume 메서드에 필요한 형태로 가공
               */
              resolve({
                id: response.consumerId,
                producerId: response.producerId,
                kind: response.kind,
                rtpParameters: response.rtpParameters,
              });
            },
          );
        });

        /**
         * 클라이언트 측 Consumer 생성
         * 서버로부터 받은 파라미터를 이용해 실제 미디어 트랙(MediaStreamTrack)을 생성
         */
        const consumer = await transport.consume(consumerParams);

        /**
         * 이벤트 핸들러 즉시 등록
         * 데이터가 흐르기(Resume) 전, 종료 이벤트를 먼저 감시하여 시그널링 유실 방지
         */
        consumer.on('transportclose', () => {
          logger.media.warn(`[Consumer] Transport 닫힘으로 인한 종료: ${consumer.id}`);
          removeConsumer(consumer.id);
        });

        // 상대방이 송출을 중단했을 때 서버가 발생시키는 이벤트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (consumer as any).on('producerclose', () => {
          logger.media.info(`[Consumer] 송출자가 방송을 종료함: ${consumer.id}`);
          removeConsumer(consumer.id);
        });

        /**
         * 서버 전송 재개 (Resume)
         *
         * Mediasoup의 Consumer는 성능 최적화를 위해 초기에 'Paused' 상태로 생성됨
         * 클라이언트 준비가 끝났음을 서버에 알려 실제 RTP 패킷 전송을 시작함
         */
        await new Promise<void>((resolve, reject) => {
          socket.emit('consume_resume', { consumerId: consumer.id }, (response) => {
            if (!response.success) {
              const errorMessage = response.error || 'Resume 실패';
              logger.media.error(`[Consumer] Resume 실패: ${errorMessage}`);
              reject(new Error(errorMessage));
            } else {
              resolve();
            }
          });
        });

        // 관리 맵 저장 및 상태 업데이트
        consumersRef.current.set(consumer.id, consumer);
        setConsumerIds(Array.from(consumersRef.current.keys()));

        logger.media.info(`Consumer 수신 성공 및 데이터 흐름 시작: ${consumer.id}`);

        // 비디오 태그에 즉시 할당 가능한 MediaStream 객체 반환
        return { consumer, stream: new MediaStream([consumer.track]) };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 수신 에러';
        logger.media.error(`Consumer 수신 실패: ${errorMessage}`);
        throw error;
      }
    },
    [device, createTransport, getRecvTransport, removeConsumer],
  );

  /**
   * 현재 활성화된 Receive Transport 반환
   */
  const getConsumers = useCallback(() => consumersRef.current, []);

  return {
    consume,
    removeConsumer,
    getConsumers,
    consumerIds,
  };
};
