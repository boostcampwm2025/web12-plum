import { useCallback, useRef } from 'react';
import { Device, Transport } from 'mediasoup-client/types';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '@/feature/room/types';

import { MediaTransportManager } from './MediaTransportManager';

/**
 * Transport 오류 메시지 매핑
 */
const ERROR_MESSAGES = {
  transportFailed: '미디어 연결에 실패했습니다. 네트워크 상태를 확인해주세요.',
  unknown: '알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * Transport 관련 오류 클래스
 */
class TransportError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;

    super(message);
    this.name = 'TransportError';
    this.type = type;

    logger.ui.error('[Transport]', message);
  }
}

type TransportDirection = 'send' | 'recv';

/**
 * Transport의 생성과 생명주기를 관리
 */
export const useMediaTransport = () => {
  /**
   * 송신/수신 Transport 참조
   */
  const transports = useRef<Record<TransportDirection, Transport | null>>({
    send: null,
    recv: null,
  });
  /**
   * 생성 중인 Transport Promise 추적
   */
  const pendingPromises = useRef<Partial<Record<TransportDirection, Promise<Transport>>>>({});

  /**
   * 미디어 전송/수신을 위한 통로 생성
   *
   * 1. 기존에 생성된 Transport가 있고 상태가 정상이면 재사용
   * 2. 이미 생성 중인 요청이 있으면 해당 Promise 반환
   * 3. 신규 생성 프로세스 진행
   */
  const createTransport = useCallback(
    async (
      socket: MediaSocket,
      device: Device,
      direction: TransportDirection,
    ): Promise<Transport> => {
      const existing = transports.current[direction];
      if (existing && !existing.closed && existing.connectionState !== 'failed') {
        return existing;
      }

      // 이미 생성 중인 요청이 있으면 해당 Promise 반환
      if (pendingPromises.current[direction]) {
        logger.media.info(`[Transport] ${direction} Transport 생성 작업이 이미 진행 중`);
        return pendingPromises.current[direction]!;
      }

      // 신규 생성 프로세스 진행
      const manager = new MediaTransportManager(socket, direction);
      const createPromise = manager.create(device).finally(() => {
        pendingPromises.current[direction] = undefined;
      });

      pendingPromises.current[direction] = createPromise;

      try {
        const transport = await createPromise;
        transports.current[direction] = transport;

        // 연결 상태 변화 감지
        transport.on('connectionstatechange', (state) => {
          if (state === 'failed' || state === 'closed') transports.current[direction] = null;
        });

        return transport;
      } catch {
        transports.current[direction] = null;
        throw new TransportError('transportFailed');
      }
    },
    [],
  );

  /**
   * 자원 정리 및 Transport 종료
   */
  const closeAllTransports = useCallback(() => {
    pendingPromises.current = {};
    transports.current.send?.close();
    transports.current.recv?.close();

    transports.current.send = null;
    transports.current.recv = null;
    logger.media.info('[Transport] 모든 미디어 전송/수신 Transport 정리 완료');
  }, []);

  return {
    createTransport,
    closeAllTransports,
  };
};
