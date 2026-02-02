import { io } from 'socket.io-client';
import type { BaseResponse, ServerToClientEvents } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

import {
  EmitWithCallbackNoPayload,
  EmitWithCallbackWithPayload,
  SocketEventName,
  SocketEventNameFromServer,
  SocketEventPayload,
  SocketEventResponse,
  SocketOffType,
  SocketOnType,
  SocketSuccessResponse,
  TypedSocket,
} from './types';

// 소켓 연결 타임아웃 (ms)
const CONNECTION_TIMEOUT = 5000;

// 소켓 서버 URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

// 소켓 클라이언트 옵션
const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'], // 우선 WebSocket 사용
  reconnection: true, // 자동 재연결 활성화
  reconnectionDelay: 1000, // 최소 재연결 시도 간격 (ms)
  reconnectionDelayMax: CONNECTION_TIMEOUT, // 최대 재연결 시도 간격 (ms)
  reconnectionAttempts: Infinity, // 무한 재연결 시도
  autoConnect: false, // 수동 연결
};

// 싱글톤 소켓 클라이언트
export class SocketClient {
  private static socket: TypedSocket | null = null;
  private static connectPromise: Promise<void> | null = null;
  private static handlerMap = new Map<
    ServerToClientEvents[SocketEventNameFromServer],
    ServerToClientEvents[SocketEventNameFromServer]
  >();

  /** 소켓 인스턴스 반환 */
  static getSocket(): TypedSocket | null {
    return this.socket;
  }

  /**
   * 소켓 연결 보장 - public
   * 이미 연결된 경우 즉시 반환, 아니면 연결 시도 후 반환
   * 최초 연결 또는 재연결 시도 시 사용
   */
  static async ensureConnected(): Promise<void> {
    // 이미 연결된 경우 바로 반환
    if (this.socket?.connected) return;
    if (this.connectPromise) return this.connectPromise;

    logger.socket.debug('[ensureConnected] 소켓 연결 시도');

    this.connect();

    try {
      await this.connectPromise!;
      logger.socket.debug('[ensureConnected] 소켓 연결 완료');
    } catch (error) {
      logger.socket.error('[ensureConnected] 소켓 연결 실패', error);
      this.connectPromise = null;
      throw error;
    }
  }

  /**
   * 실제 소켓 인스턴스 생성 및 연결 - private
   * 싱글톤을 유지하기 위해 private 메서드로 구현
   */
  private static connect(): void {
    // 기존 소켓이 있으면 핸들러 제거
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, SOCKET_OPTIONS) as TypedSocket;
    this.setupSocketListeners();

    this.connectPromise = this.createConnectPromise();
    this.socket.connect();
  }

  /** 소켓 연결 해제 */
  static disconnect(): void {
    if (this.connectPromise) this.connectPromise = null;
    if (!this.socket) return;

    this.socket.removeAllListeners();
    this.socket.disconnect();

    this.socket = null;
    this.connectPromise = null;
    this.handlerMap.clear();
    logger.socket.debug('소켓 연결 해제');
  }

  /** 소켓 연결 프로미스 생성 */
  private static createConnectPromise(): Promise<void> {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      // 연결 타임아웃 설정
      const timer = setTimeout(() => {
        this.connectPromise = null;
        reject(new Error(`소켓 연결 대기 시간 초과 (${CONNECTION_TIMEOUT}ms)`));
      }, CONNECTION_TIMEOUT);

      /**
       * 연결 성공 핸들러 등록
       * 'once'를 사용하여 한 번만 실행되도록 함
       */
      this.socket!.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      /**
       * 연결 오류 핸들러 등록
       * socket.active가 false인 경우에만 처리
       * 서버에서 명시적 연결 해제 시 타임아웃까지 대기할 필요 없음
       */
      this.socket!.once('connect_error', (error) => {
        if (this.socket?.active) return;
        clearTimeout(timer);
        this.connectPromise = null;
        reject(new Error(error.message || '소켓 연결 오류'));
      });
    });
    return promise;
  }

  /** 소켓 이벤트 리스너 설정 */
  private static setupSocketListeners(): void {
    const socket = this.socket!;

    socket.on('connect', () => {
      logger.socket.info('소켓 연결 성공', socket.id);
    });

    /**
     * 소켓 연결 해제 처리
     * - 서버에서 연결 해제 시 : 'io server disconnect' - 자동 재연결 불가
     * - 네트워크 문제 등으로 연결이 끊어졌을 때 : 'ping timeout', 'transport close' 등 - 자동 재연결 시도
     */
    socket.on('disconnect', (reason) => logger.socket.debug('소켓 연결 해제', reason));

    /**
     * 소켓 연결 오류 처리
     * - 서버 미접속 시 : 'connect_error' 이벤트 발생
     * - 네트워크 문제 등으로 연결이 끊어졌을 때 : 'reconnect_error' 이벤트 발생
     */
    socket.on('connect_error', (error) => logger.socket.error('연결 오류', error));

    socket.io.on('reconnect', () => {
      logger.socket.debug('소켓 재연결 성공');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      logger.socket.debug(`소켓 재연결 시도 중... (${attempt}회)`);
    });

    socket.io.on('reconnect_error', (error) =>
      logger.socket.error('재연결 시도 실패', error.message),
    );
  }

  /** 서버 이벤트 핸들러 등록 */
  static async on<E extends SocketEventNameFromServer>(
    event: E,
    handler: ServerToClientEvents[E],
  ): Promise<() => void> {
    await this.ensureConnected();

    // 핸들러 래핑하여 런타임 에러 캐치
    const wrappedHandler = ((...args: Parameters<ServerToClientEvents[E]>) => {
      try {
        (handler as (...args: Parameters<ServerToClientEvents[E]>) => void)(...args);
      } catch (error) {
        logger.socket.error(`[${String(event)}] 핸들러 런타임 에러`, error);
      }
    }) as ServerToClientEvents[E];

    // 동일 핸들러 중복 등록 방지
    if (this.handlerMap.has(handler)) this.off(event, handler);

    // 핸들러 맵에 저장
    this.handlerMap.set(handler, wrappedHandler);
    (this.socket!.on as SocketOnType)(event, wrappedHandler);

    // 해제 함수 반환
    return () => this.off(event, handler);
  }

  /** 서버 이벤트 핸들러 해제 */
  static off<E extends SocketEventNameFromServer>(
    event: E,
    handler?: ServerToClientEvents[E],
  ): void {
    if (!this.socket) return;

    // 핸들러가 지정된 경우 해제, 없을 경우 해당 이벤트의 모든 핸들러 해제
    if (handler) {
      // 등록된 래핑 핸들러 조회
      const wrapped = this.handlerMap.get(handler) as ServerToClientEvents[E] | undefined;
      if (!wrapped) return;

      (this.socket.off as SocketOffType)(event, wrapped);
      this.handlerMap.delete(handler);
    } else {
      (this.socket.off as SocketOffType)(event);
    }
  }

  /** 이벤트 emit 및 ACK 응답 대기 */
  static async emitWithAck<E extends SocketEventName>(
    event: E,
    payload?: SocketEventPayload<E>,
  ): Promise<SocketSuccessResponse<E>> {
    await this.ensureConnected();

    const promise: Promise<SocketSuccessResponse<E>> = new Promise((resolve, reject) => {
      // ACK 응답 대기 타이머
      const timer = setTimeout(() => {
        logger.socket.error('소켓 ACK 응답 대기 시간 초과', { event, payload });
        reject(new Error('소켓 ACK 응답 대기 시간 초과'));
      }, CONNECTION_TIMEOUT);

      // ACK 응답 핸들러
      const handleAck = (response: SocketEventResponse<E>) => {
        clearTimeout(timer);
        const typedResponse = response as BaseResponse;
        if (!typedResponse.success) {
          reject(new Error(`[${event}] ACK 실패: ${typedResponse.error}`));
        }

        logger.socket.debug('ACK 성공', { event, response });
        resolve(response as SocketSuccessResponse<E>);
      };

      // payload 유무에 따른 emit 호출
      if (payload == null) {
        (this.socket!.emit as EmitWithCallbackNoPayload)(event, handleAck);
      } else {
        (this.socket!.emit as EmitWithCallbackWithPayload)(event, payload, handleAck);
      }
    });
    return promise;
  }
}
