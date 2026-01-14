import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { logger } from '@/shared/lib/logger';
import type { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

/**
 * 소켓 연결 타임아웃 시간 (밀리초)
 */
const CONNECTION_TIMEOUT = 15000;

/**
 * 소켓 연결 옵션
 */
const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'], // 전송방식의 우선순위
  reconnection: true, // 자동 재연결 활성화
  reconnectionDelay: 1000, // 재연결 시도 간격 (최소)
  reconnectionDelayMax: 15000, // 재연결 시도 간격 (최대)
  reconnectionAttempts: Infinity, // 최대 재연결 시도 횟수
  autoConnect: false, // 수동으로 connect() 호출 필요
};

interface SocketState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  reconnectCount: number;
  actions: {
    connect: () => Promise<Socket<ServerToClientEvents, ClientToServerEvents> | null>;
    disconnect: () => void;
    emit: <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => void;
  };
}

/**
 * 전역 소켓 인스턴스 및 연결 상태 관리 스토어
 *
 * packages/shared-interfaces/src/index.ts 에 정의된
 * ServerToClientEvents, ClientToServerEvents 타입을 사용하여
 * 소켓 이벤트의 타입 안전성 보장
 */
export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  reconnectCount: 0,

  actions: {
    /**
     * 소켓 연결
     * 소켓이 연결되어 있지 않으면 연결을 시도
     */
    connect: async () => {
      const { socket } = get();

      // 이미 연결되어 있다면 즉시 현재 소켓 반환
      if (socket?.connected) {
        logger.socket.info('소켓이 이미 연결되어 있음');
        return socket;
      }

      // 연결 프로세스 시작 상태 설정
      logger.socket.info('소켓 연결 시도');
      let currentSocket = socket;

      if (!currentSocket) {
        // 소켓 인스턴스 생성 및 설정
        currentSocket = io(SOCKET_URL, SOCKET_OPTIONS);
        // 이전에 등록된 모든 이벤트 리스너 제거하여 중복 등록 방지
        currentSocket.removeAllListeners();

        /**
         * 소켓 연결 이벤트 리스너
         * 소켓이 서버에 성공적으로 연결되었을 때 트리거 됨
         */
        currentSocket.on('connect', () => {
          set({ isConnected: true, reconnectCount: 0 });
          logger.socket.info('소켓 연결 성공', currentSocket?.id);
        });

        /**
         * 소켓 연결 해제 처리
         *
         * 1. io server/client disconnect
         * - 클라이언트 또는 서버가 명시적으로 연결을 끊은 경우
         * - 자동 재연결 X
         *
         * 2. ping timeout
         * - 서버가 pingInterval + pingTimeout 범위 내에서 PING을 보내지 않아 연결이 끊긴 경우
         * - 자동 재연결 O
         *
         * 3. transport close
         * - 서버 또는 클라이언트에서 transport가 닫힌 경우
         * - 사용자가 네트워크 연결을 끊거나, Wi-Fi에서 모바일 데이터로 전환하는 등의 상황
         * - 자동 재연결 O
         *
         * 4. transport error
         * - 연결 중 오류가 발생한 경우
         * - 자동 재연결 O
         */
        currentSocket.on('disconnect', (reason) => {
          set({ isConnected: false });
          logger.socket.info('소켓 연결 해제', reason);
        });

        /**
         * 소켓 연결 오류 처리
         * socket.active 속성을 확인하여 자동 재연결 여부를 판단
         * - true: 일시적 오류, 소켓이 자동으로 재연결 시도
         * - false: 서버가 연결을 거부함, 수동으로 socket.connect() 호출 필요
         *
         * 1. 저수준 연결 설정 불가
         * 2. 서버가 미들웨어 함수에서 연결을 명시적으로 거부한 경우
         * - 인증 토큰이 유효하지 않거나 만료된 경우
         * - 사용자 권한이 부족한 경우
         */
        currentSocket.on('connect_error', (error) => {
          set({ isConnected: false });

          if (currentSocket?.active) {
            logger.socket.info('소켓 일시적 연결 오류, 재시도 중');
          } else {
            logger.socket.info('소켓 연결 거부 (재시도 중단)', error.message);
          }
        });

        /**
         * 재연결 시도 이벤트 리스너
         */
        currentSocket.io.on('reconnect_attempt', (attempt) => {
          set({ reconnectCount: attempt });
          logger.socket.info(`소켓 재연결 시도 중... (${attempt}회)`);
        });

        // 재연결 실패
        currentSocket.io.on('reconnect_error', (error) => {
          logger.socket.error('재연결 시도 실패', error.message);
        });
      }

      set({ socket: currentSocket });

      // 연결 완료를 기다리는 Promise 반환
      return new Promise((resolve) => {
        // 강제 타임아웃 설정
        const timer = setTimeout(() => {
          logger.socket.warn('연결 대기 시간 초과');
          // 타임아웃이 발생하면 실패(null)로 처리하고 약속을 끝냄
          resolve(null);
        }, CONNECTION_TIMEOUT);

        /**
         * 서버와 연결이 성공했을 때 발생하는 이벤트
         *
         * 'once'를 사용했기 때문에 이 리스너는 실행 직후 자동으로 제거됨
         * 성공하면 소켓 객체를 resolve(반환)
         */
        currentSocket.once('connect', () => {
          clearTimeout(timer);
          resolve(currentSocket);
        });

        /**
         * 연결 도중 에러가 나거나 거부당했을 때 발생하는 이벤트
         *
         * 실패하면 null을 resolve(반환)하여 호출한 쪽에서 실패를 알 수 있게 함
         */
        currentSocket.once('connect_error', () => {
          // 정해진 시간 내에 연결에 실패했을 때
          clearTimeout(timer);
          resolve(null);
        });

        // 실제 연결 시작
        currentSocket.connect();
      });
    },

    /**
     * 소켓 연결 해제 처리
     * 클라이언트에서 명시적으로 연결을 끊음
     */
    disconnect: () => {
      const { socket } = get();
      if (socket && socket.connected) {
        socket.removeAllListeners();
        socket.disconnect();
        set({ socket: null, isConnected: false, reconnectCount: 0 });
        logger.socket.info('소켓 연결 해제 요청됨');
      } else {
        logger.socket.debug('소켓이 이미 연결 해제되어 있음');
      }
    },

    /**
     * 서버에 이벤트 전송
     */
    emit: (event, ...args) => {
      const { socket, isConnected } = get();
      if (!socket || !isConnected) {
        logger.socket.warn('소켓이 연결되어 있지 않아 이벤트를 전송할 수 없음', event, args);
        return;
      }

      socket.emit(event, ...args);
    },
  },
}));
