import { useCallback, useRef } from 'react';
import { Device, Transport } from 'mediasoup-client/types';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '../types';
import { TransportSignaling } from './TransportSignaling';

/**
 * Transport의 생성과 생명주기를 관리
 *
 * 리액트 리렌더링과 무관하게 연결 상태를 유지하기 위해 useRef를 활용하며,
 * 중복 요청 방지 로직을 통해 네트워크 자원을 효율적으로 관리
 */
export const useMediaTransport = () => {
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
   * 1. 기존에 생성된 Transport가 있고 상태가 정상이면 재사용
   * 2. 이미 생성 중인 요청이 있으면 해당 Promise 반환
   * 3. 신규 생성 프로세스 진행
   */
  const createTransport = useCallback(
    async (device: Device, socket: MediaSocket, direction: 'send' | 'recv'): Promise<Transport> => {
      if (!device?.loaded) {
        throw new Error('Mediasoup Device가 로드되지 않았습니다. initDevice를 먼저 실행하세요.');
      }

      const isSender = direction === 'send';
      const transportRef = isSender ? sendTransportRef : recvTransportRef;

      /**
       * 1. 기존 Transport 재사용 검사
       *
       * 이미 생성된 Transport가 있고 상태가 정상이면 새로 만들지 않고 기존 통로를 재사용
       * 연결이 실패(failed)했거나 닫힌(closed) 경우에만 새로운 생성을 진행
       */
      if (
        transportRef.current &&
        !transportRef.current.closed &&
        transportRef.current.connectionState !== 'failed'
      ) {
        logger.media.debug(`${direction} Transport가 이미 존재하여 재사용`);
        return transportRef.current;
      }

      // 2. 이미 생성 중인 요청이 있다면 해당 Promise 반환
      if (creatingPromiseRef.current[direction]) {
        logger.media.debug(`${direction} Transport 생성 작업이 이미 진행 중이므로 대기 후 재사용`);
        return creatingPromiseRef.current[direction]!;
      }

      // 3. 신규 생성 프로세스
      const createPromise = (async () => {
        try {
          // 서버에서 파라미터 획득
          const response = await TransportSignaling.createTransport(socket, direction);

          // 클라이언트 인스턴스 생성
          const transport = isSender
            ? device.createSendTransport(response)
            : device.createRecvTransport(response);

          // 모든 시그널링 핸들러 설정 (Connect, Produce, StateChange)
          TransportSignaling.setupAllHandlers(transport, socket, direction, () => {
            logger.media.warn(`${direction} Transport 연결에 실패하여 정리`);
            transportRef.current = null;
          });

          transportRef.current = transport;

          return transport;
        } catch (error) {
          logger.media.error(`${direction} Transport 생성 중 오류:`, error);
          throw error;
        } finally {
          creatingPromiseRef.current[direction] = undefined;
        }
      })();

      creatingPromiseRef.current[direction] = createPromise;
      return createPromise;
    },
    [],
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
