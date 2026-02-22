import { io } from 'socket.io-client';
import type { ServerToClientEvents } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

import { SocketError } from './error';
import {
  EmitWithAckArgs,
  EmitWithAckType,
  isSuccessResponse,
  SocketEventName,
  SocketEventNameFromServer,
  SocketFailResponse,
  SocketOffType,
  SocketOnType,
  SocketSuccessResponse,
  TypedSocket,
} from './types';

const CONNECTION_TIMEOUT = 5000; // 소켓 초기 연결 / ack 타임아웃 (ms)
const RECONNECTION_DELAY = 300; // 재연결 시도 간격
const RECONNECTION_DELAY_MAX = 3000; // 재연결 간격 상한

/**
 * 소켓 클라이언트 옵션
 * - transports: WebSocket 우선, 폴링은 fallback 용도
 * - reconnection: 자동 재연결 활성화
 * - reconnectionDelay: 재연결 시도 간격 (ms)
 * - reconnectionDelayMax: 재연결 시도 간격 상한 (ms)
 * - randomizationFactor: jitter 비율 / 동시 재연결로 인한 부하 완화
 * - reconnectionAttempts: 무한 재연결 시도
 * - autoConnect: 수동 연결 (connect() 메서드로 명시적 연결 제어)
 */
const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: RECONNECTION_DELAY,
  reconnectionDelayMax: RECONNECTION_DELAY_MAX,
  randomizationFactor: 0.3,
  reconnectionAttempts: Infinity,
  autoConnect: false,
};

// 싱글톤 소켓 클라이언트
export class SocketClient {
  private static instance: TypedSocket | null = null;
  private static connectionPromise: Promise<void> | null = null;
  private static currentUrl: string | null = null;
  private static handlers = new WeakMap<
    ServerToClientEvents[SocketEventNameFromServer],
    (...args: unknown[]) => void
  >();
  private static reconnectHandlers = new Set<() => void>();

  /**
   * 소켓 인스턴스 접근
   */
  static getSocket(): TypedSocket | null {
    return this.instance;
  }

  /**
   * 소켓 서버에 연결
   * - 이미 연결된 경우 바로 반환, 연결 중인 경우 기존 연결이 완료될 때까지 기다림
   * - URL이 변경된 경우 기존 연결을 정리하고 새 URL로 연결 시도
   * - 연결 성공 시 내부 이벤트 리스너 설정
   */
  static async connect(url: string): Promise<void> {
    // 이미 연결된 경우 바로 반환
    if (this.currentUrl === url) {
      if (this.instance?.connected) return;
      if (this.connectionPromise) return this.connectionPromise;
    }

    // URL이 변경된 경우 기존 연결 정리
    const isUrlChanged = this.currentUrl && this.currentUrl !== url;
    if (isUrlChanged) this.disconnect();
    this.currentUrl = url;

    // 새로운 연결 시도
    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = io(url, SOCKET_OPTIONS) as TypedSocket;
      this.instance = socket;
      socket.connect();

      // 연결 타임아웃 설정
      const timeout = setTimeout(() => {
        this.cleanupConnection('연결 타임아웃');
        reject(new Error('소켓 연결 타임아웃'));
      }, CONNECTION_TIMEOUT);

      // 연결 성공 이벤트는 한 번만 듣도록 설정
      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.off('connect_error');
        this.setupInternalListeners();
        logger.socket.info('소켓 연결 성공:', socket.id);
        this.connectionPromise = null;
        resolve();
      });

      // 연결 실패 이벤트 리스너
      socket.on('connect_error', (error: Error) => {
        logger.socket.warn('소켓 연결 실패, 재시도 중...', error.message);
      });
    });

    return this.connectionPromise;
  }

  /**
   * 재연결 핸들러 등록
   * - 소켓이 재연결될 때마다 등록된 핸들러가 호출됨
   * - 반환된 함수는 핸들러 등록 취소 (off) 용도
   */
  static onReconnect(handler: () => void): () => void {
    this.reconnectHandlers.add(handler);
    return () => this.reconnectHandlers.delete(handler);
  }

  /**
   * 내부 이벤트 리스너 설정
   * - 연결 성공 시 이벤트 리스너 등록
   * - 중복 등록 방지 위해 기존 리스너 제거 후 새로 등록
   * - 재연결 성공 시 내부 리스너 재설정
   */
  private static setupInternalListeners(): void {
    if (!this.instance) return;

    // 이벤트 중복 방지
    this.instance.off('disconnect');
    this.instance.offAny();
    this.instance.offAnyOutgoing();

    this.instance.io.off('reconnect');
    this.instance.io.off('reconnect_attempt');
    this.instance.io.off('reconnect_error');

    // 발신 로그 (클라이언트 -> 서버)
    this.instance.onAnyOutgoing((event, ...args) => {
      logger.socket.debug(`[${String(event)} / OUT]`, args);
    });

    // 수신 로그 (서버 -> 클라이언트)
    this.instance.onAny((event, ...args) => {
      logger.socket.debug(`[${String(event)} / IN]`, args);
    });

    // 연결 해제 모니터링
    this.instance.on('disconnect', (reason: string) => {
      logger.socket.warn('소켓 연결 해제:', reason);

      if (reason === 'io server disconnect') {
        logger.socket.info('서버 요청에 의한 연결 종료');
        this.disconnect();
      }
    });

    // 자동 재연결 성공 시 내부 리스너 재설정
    this.instance.io.on('reconnect', () => {
      logger.socket.info('소켓 재연결 성공');
      this.setupInternalListeners();
      this.reconnectHandlers.forEach((handler) => handler());
    });

    // 재연결 시도 모니터링
    this.instance.io.on('reconnect_attempt', (attempt) => {
      logger.socket.debug(`소켓 재연결 시도 중 (${attempt}회)`);
    });

    // 재연결 실패 모니터링
    this.instance.io.on('reconnect_error', (error) => {
      logger.socket.error('소켓 재연결 실패:', error.message);
    });
  }

  /**
   * 서버 이벤트 리스너 등록
   * - 동일 핸들러 중복 등록 방지 (이미 등록된 핸들러는 재등록하지 않고 off 함수 반환)
   * - 반환된 함수는 off 호출로 핸들러 제거
   */
  static on<E extends SocketEventNameFromServer>(
    event: E,
    handler: ServerToClientEvents[E],
  ): () => void {
    // 연결이 없는 경우 에러 throw
    if (!this.instance) {
      throw new Error(`소켓 이벤트 리스너 등록 실패: ${String(event)}`);
    }

    // 동일 핸들러 중복 등록 방지
    if (this.handlers.has(handler)) {
      return () => this.off(event, handler);
    }

    // 핸들러 래핑하여 에러 캡처 및 로깅
    const targetHandler = handler as (...args: unknown[]) => void;
    const wrapped = (...args: unknown[]) => {
      try {
        targetHandler(...args);
      } catch (err) {
        logger.socket.error(`[${String(event)}] 핸들러 에러:`, err);
      }
    };

    // 래핑된 핸들러 저장 및 등록
    this.handlers.set(handler, wrapped);
    (this.instance.on as SocketOnType)(event, wrapped);

    // 반환된 함수는 off 호출로 핸들러 제거
    return () => this.off(event, handler);
  }

  /**
   * 서버 이벤트 리스너 제거
   * - 제공되지 않은 경우 해당 이벤트의 모든 핸들러 제거
   * - 핸들러가 제공된 경우 해당 핸들러만 제거
   */
  static off<E extends SocketEventNameFromServer>(
    event: E,
    handler?: ServerToClientEvents[E],
  ): void {
    if (!this.instance) return;

    // 핸들러가 제공되지 않은 경우 해당 이벤트의 모든 핸들러 제거
    if (!handler) {
      (this.instance.off as SocketOffType)(event);
      return;
    }

    // 핸들러가 제공된 경우 해당 핸들러만 제거
    const wrappedHandler = this.handlers.get(handler);
    if (!wrappedHandler) return;

    (this.instance.off as SocketOffType)(event, wrappedHandler);
    this.handlers.delete(handler);
  }

  /**
   * 서버로 이벤트 발신
   * - 연결이 없는 경우 connect()를 통해 자동으로 연결 시도
   * - 서버 응답이 success: false인 경우 SocketError throw
   * - 성공적인 응답은 SocketSuccessResponse 타입으로 반환
   */
  static async emitWithAck<E extends SocketEventName>(
    event: E,
    ...args: EmitWithAckArgs<E>
  ): Promise<SocketSuccessResponse<E>> {
    // 연결이 없는 경우 자동으로 연결 시도
    if (!this.currentUrl) throw new Error('소켓 URL이 설정되지 않음');
    await this.connect(this.currentUrl);

    try {
      const socketWithTimeout = this.instance!.timeout(CONNECTION_TIMEOUT);
      const response = await (socketWithTimeout.emitWithAck as EmitWithAckType)(event, ...args);
      logger.socket.debug(`[${String(event)} / ACK]`, response);

      // 서버 응답이 success: false인 경우 SocketError throw
      if (!isSuccessResponse<E>(response)) {
        throw new SocketError(event, response as SocketFailResponse<E>);
      }

      return response;
    } catch (error) {
      // 에러 로깅 및 래핑
      const isError = error instanceof Error;
      const errorMessage = isError ? error.message : String(error);
      logger.socket.error(`[${String(event)}] ${errorMessage}`, { event, args });

      if (error instanceof SocketError) throw error;
      throw new Error(errorMessage);
    }
  }

  /**
   * 소켓 연결 해제
   * - 연결이 존재하는 경우에만 disconnect 호출
   * - 연결 해제 시 모든 리스너 제거하여 메모리 누수 방지
   * - 연결 URL 초기화하여 다음 connect 시 새 URL로 연결 가능하도록 함
   */
  static disconnect(): void {
    this.cleanupConnection('수동 연결 해제');
    this.currentUrl = null;
  }

  /**
   * 연결 정리 메서드
   * - 연결이 존재하는 경우 모든 리스너 제거 및 disconnect 호출
   * - 연결 관련 상태 초기화
   */
  private static cleanupConnection(reason: string): void {
    if (this.instance) {
      this.instance.removeAllListeners();
      this.instance.disconnect();
      this.instance = null;
    }

    this.connectionPromise = null;
    this.handlers = new WeakMap();
    logger.socket.debug('소켓 연결 정리:', reason);
  }
}
