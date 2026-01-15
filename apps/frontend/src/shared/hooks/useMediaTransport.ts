import { useCallback, useRef } from 'react';
import { Transport } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';

import {
  BaseResponse,
  ClientToServerEvents,
  CreateTransportResponse,
  MediaType,
  ServerToClientEvents,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';

/**
 * Transport의 생성과 생명주기를 관리
 *
 * 리액트 리렌더링과 무관하게 연결 상태를 유지하기 위해 useRef를 활용하며,
 * 중복 요청 방지 로직을 통해 네트워크 자원을 효율적으로 관리
 */
export const useMediaTransport = () => {
  // 전역 스토어에서 로드된 Device 인스턴스를 참조
  const device = useMediaDeviceStore((state) => state.device);

  /**
   * 리렌더링 시에도 실제 WebRTC 인스턴스를 보존하기 위해 Ref를 사용
   * Transport 인스턴스는 내부적으로 네이티브 시스템 자원(포트 등)을 사용하기 때문에 불필요한 재생성을 피하는 것이 중요
   * 이 인스턴스들은 'close()' 호출 전까지 실제 시스템 포트와 연결을 유지됨
   */
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);

  /**
   * createTransport가 짧은 시간에 여러 번 호출될 때,
   * 서버에 중복 요청을 보내지 않고 이미 진행 중인 생성 프로세스의 Promise를 공유하여 반환
   *
   * ex) 사용자가 빠르게 여러 번 '카메라 켜기' 버튼을 클릭하는 경우 등
   */
  const creatingPromiseRef = useRef<{ send?: Promise<Transport>; recv?: Promise<Transport> }>({});

  /**
   * 미디어 전송/수신을 위한 통로 생성
   *
   * 1. 기존에 살아있는 Transport가 있다면 즉시 재사용하여 불필요한 핸드셰이크를 방지
   * 2. 서버에 Transport 생성을 요청하고, 응답받은 파라미터로 클라이언트 인스턴스를 만듦
   * 3. 'connect'와 'produce' 이벤트를 소켓 시그널링과 결합
   */
  const createTransport = useCallback(
    async (
      socket: Socket<ServerToClientEvents, ClientToServerEvents>,
      direction: 'send' | 'recv',
    ): Promise<Transport> => {
      if (!device?.loaded) {
        throw new Error('Mediasoup Device가 로드되지 않았습니다. initDevice를 먼저 실행하세요.');
      }

      const isSender = direction === 'send';
      const existing = isSender ? sendTransportRef.current : recvTransportRef.current;

      /**
       * 기존 자원 확인
       *
       * 이미 생성된 Transport가 있고 상태가 정상이면 새로 만들지 않고 기존 통로를 재사용
       * 연결이 실패(failed)했거나 닫힌(closed) 경우에만 새로운 생성을 진행
       */
      if (existing && !existing.closed && existing.connectionState !== 'failed') {
        logger.media.debug(`${direction} Transport가 이미 존재하여 재사용`);
        return existing;
      }

      /**
       * 생성 요청 중복 방지
       *
       * 현재 동일한 방향으로 생성 작업이 진행 중이라면, 새로운 요청을 쏘지 않고
       * 이미 생성 중인 Promise를 기다렸다가 그 결과를 함께 공유
       */
      const currentCreating = isSender
        ? creatingPromiseRef.current.send
        : creatingPromiseRef.current.recv;

      if (currentCreating) {
        logger.media.debug(`${direction} Transport 생성 작업이 이미 진행 중이므로 대기 후 재사용`);
        return currentCreating;
      }

      /**
       * 신규 생성 프로세스
       * 서버와 클라이언트 간의 WebRTC 파라미터 교환 및 인스턴스 초기화
       */
      const createPromise = new Promise<Transport>((resolve, reject) => {
        socket.emit('create_transport', { direction }, (response: CreateTransportResponse) => {
          // 실패 응답 처리: id가 없으면 실패 응답
          if (!response.success) {
            const errorResponse = response as BaseResponse;
            const errorMsg = errorResponse.error || 'Transport 생성 실패';
            logger.media.error(`${direction} 서버 Transport 생성 요청 실패`, errorMsg);
            reject(new Error(errorMsg));
            return;
          }

          // 성공 응답 검증: id 필수
          if (!('id' in response)) return reject(new Error('서버 응답 형식에서 ID가 누락됨'));

          // 성공 응답에서 Transport 옵션 추출
          const { id, iceParameters, iceCandidates, dtlsParameters } = response;

          try {
            // 서버 응답 설정을 기반으로 클라이언트 측 Transport 객체를 생성
            const transportOptions = { id, iceParameters, iceCandidates, dtlsParameters };
            const transport = isSender
              ? device.createSendTransport(transportOptions)
              : device.createRecvTransport(transportOptions);

            /**
             * DTLS 핸드셰이크
             *
             * WebRTC 보안 연결을 위해 클라이언트와 서버가 인증 정보를 교환할 때 발생
             * 이 콜백이 성공해야 실제 미디어 데이터가 흐를 수 있는 보안 터널이 뚫림
             */
            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
              socket.emit(
                'connect_transport',
                { transportId: transport.id, dtlsParameters },
                (res) => {
                  if (!res.success) {
                    const errorMessage = res.error || 'DTLS 연결 실패';
                    logger.media.error('Transport DTLS 연결 실패:', errorMessage);
                    return errback(new Error(errorMessage));
                  }
                  callback();
                },
              );
            });

            /**
             * 미디어 송출 시작 (Send 전용)
             *
             * 클라이언트가 'produce()'를 호출할 때 발생하며, 서버측에 Producer 생성을 요청
             */
            if (isSender) {
              transport.on(
                'produce',
                async ({ kind, rtpParameters, appData }, callback, errback) => {
                  socket.emit(
                    'produce',
                    {
                      transportId: transport.id,
                      type: (appData?.type || kind) as MediaType,
                      rtpParameters,
                    },
                    (res) => {
                      if (!res.success) {
                        const errorResponse = response as BaseResponse;
                        const errorMessage = errorResponse.error || 'Producer 생성 실패';
                        logger.media.error('서버 Producer 생성 실패:', errorMessage);
                        return errback(new Error(errorMessage));
                      }

                      if ('producerId' in res) {
                        callback({ id: res.producerId });
                      } else {
                        errback(new Error('서버 응답에 producerId가 없습니다.'));
                      }
                    },
                  );
                },
              );
            }

            /**
             * 연결 상태 모니터링
             *
             * 네트워크 환경 변화로 연결이 끊기거나 실패했을 때를 감지
             * failed 상태가 되면 Ref를 비워 다음 호출 시 자동으로 재연결 로직이 돌아가도록 함
             */
            transport.on('connectionstatechange', (state) => {
              logger.media.info(`${direction} Transport 연결 상태 변경: ${state}`);
              if (state === 'failed' || state === 'closed') {
                (isSender ? sendTransportRef : recvTransportRef).current = null;
                logger.media.warn(`${direction} Transport 사용 불가능 상태. 다음 요청 시 재생성됨`);
              }
            });

            // 생성된 인스턴스를 Ref에 저장하여 전역적으로 참조 가능하게 함
            if (isSender) sendTransportRef.current = transport;
            else recvTransportRef.current = transport;

            logger.media.info(`${direction} Transport 최종 생성 완료 (ID: ${transport.id})`);
            resolve(transport);
          } catch (err) {
            logger.media.error(`${direction} 클라이언트 Transport 인스턴스 생성 중 오류:`, err);
            reject(err);
          }
        });
      }).finally(() => {
        /**
         * Promise Cleanup
         *
         * 생성 성공 여부와 상관없이 작업이 끝났으므로 진행 중인 Promise 캐시를 비움
         * 그래야 다음 번 생성 요청 시 새로운 프로세스가 정상적으로 동작할 수 있음
         */
        if (isSender) creatingPromiseRef.current.send = undefined;
        else creatingPromiseRef.current.recv = undefined;
      });

      // 현재 진행 중인 생성 작업을 Ref에 기록합니다.
      if (isSender) creatingPromiseRef.current.send = createPromise;
      else creatingPromiseRef.current.recv = createPromise;

      return createPromise;
    },
    [device],
  );

  /**
   * 자원 정리 및 Transport 종료
   *
   * 강의실 퇴장이나 로그아웃 시 호출하여 모든 WebRTC 연결을 명시적으로 닫음
   * close()를 호출해야 서버 및 클라이언트의 시스템 포트 자원이 즉시 회수됨
   */
  const closeTransports = useCallback(() => {
    // 진행 중인 모든 비동기 생성 작업의 참조를 초기화함
    creatingPromiseRef.current = {};

    // 실제 WebRTC 연결을 종료하고 하드웨어 자원 점유를 해제함
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    // 참조 변수를 null로 만들어 다음 요청 시 새로 생성되도록 함
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    logger.media.info('모든 미디어 전송/수신 Transport가 안전하게 정리됨');
  }, []);

  /**
   * 현재 활성화된 Send Transport 반환
   */
  const getSendTransport = useCallback(() => sendTransportRef.current, []);

  /**
   * 현재 활성화된 Receive Transport 반환
   */
  const getRecvTransport = useCallback(() => recvTransportRef.current, []);

  return {
    createTransport,
    closeTransports,
    getSendTransport,
    getRecvTransport,
  };
};
