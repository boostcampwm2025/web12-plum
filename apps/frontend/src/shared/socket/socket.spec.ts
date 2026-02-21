import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io } from 'socket.io-client';
import { SocketClient } from './socket';
import { SocketError } from './error';
import { TypedSocket } from './types';

// io() 호출마다 독립적인 mock 인스턴스 반환
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    offAny: vi.fn(),
    onAny: vi.fn(),
    onAnyOutgoing: vi.fn(),
    offAnyOutgoing: vi.fn(),
    emitWithAck: vi.fn(),
    timeout: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn(),
    connected: false,
    id: 'test-socket-id',
    io: {
      on: vi.fn(),
      off: vi.fn(),
    },
  })),
}));

// logger 모킹: 테스트 로그 출력 억제
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    socket: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('SocketClient', () => {
  const MOCK_URL = 'http://localhost:3000';
  const MOCK_URL_2 = 'http://localhost:4000';

  beforeEach(() => {
    vi.clearAllMocks();
    SocketClient.disconnect();
  });

  afterEach(() => {
    SocketClient.disconnect();
  });

  /** socket.once에 등록된 'connect' 핸들러를 수동으로 실행 */
  function triggerConnectEvent(socket: TypedSocket) {
    const handler = vi.mocked(socket!.once).mock.calls.find((call) => call[0] === 'connect')?.[1];
    if (typeof handler === 'function') (handler as () => void)();
  }

  /**
   * 연결 완료 상태의 SocketClient를 셋업하는 헬퍼
   * connected = true로 조작해 emitWithAck 내부 connect() 재호출을 방지함
   */
  async function setupConnectedClient(url = MOCK_URL) {
    const promise = SocketClient.connect(url);
    const socket = SocketClient.getSocket()!;
    triggerConnectEvent(socket);
    await promise;
    (socket as any).connected = true;
    return socket;
  }

  describe('connect()', () => {
    it('새로운 URL로 연결 시 io()와 socket.connect()를 호출해야 한다', async () => {
      const socket = await setupConnectedClient();

      expect(io).toHaveBeenCalledWith(MOCK_URL, expect.any(Object));
      expect(socket.connect).toHaveBeenCalledOnce();
    });

    it('이미 연결된 상태에서 동일 URL로 재호출 시 io()는 한 번만 호출되어야 한다', async () => {
      await setupConnectedClient();
      await SocketClient.connect(MOCK_URL);

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('연결 중(connectionPromise 존재) 상태에서 동일 URL로 재호출 시 io()는 한 번만 호출되어야 한다', async () => {
      const promise1 = SocketClient.connect(MOCK_URL);
      const promise2 = SocketClient.connect(MOCK_URL);

      triggerConnectEvent(SocketClient.getSocket()!);
      await Promise.all([promise1, promise2]);

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('URL이 변경되면 기존 소켓을 정리하고 새 URL로 재연결해야 한다', async () => {
      const socket1 = await setupConnectedClient(MOCK_URL);

      const promise2 = SocketClient.connect(MOCK_URL_2);
      const socket2 = SocketClient.getSocket()!;
      triggerConnectEvent(socket2);
      await promise2;

      // 기존 소켓 정리 확인
      expect(socket1.removeAllListeners).toHaveBeenCalled();
      expect(socket1.disconnect).toHaveBeenCalled();
      // 새 소켓으로 교체 확인
      expect(io).toHaveBeenCalledTimes(2);
      expect(io).toHaveBeenLastCalledWith(MOCK_URL_2, expect.any(Object));
    });

    it('CONNECTION_TIMEOUT 초과 시 에러를 throw해야 한다', async () => {
      vi.useFakeTimers();
      try {
        const promise = SocketClient.connect(MOCK_URL);
        vi.advanceTimersByTime(5001);
        await expect(promise).rejects.toThrow('소켓 연결 타임아웃');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('on() / off()', () => {
    it('소켓 미연결 상태에서 on() 호출 시 에러를 throw해야 한다', () => {
      expect(() => SocketClient.on('new_chat', vi.fn() as any)).toThrow();
    });

    it('이벤트를 등록하면 socket.on이 호출되어야 한다', async () => {
      const socket = await setupConnectedClient();
      const handler = vi.fn();

      SocketClient.on('new_chat', handler as any);

      expect(socket.on).toHaveBeenCalledWith('new_chat', expect.any(Function));
    });

    it('동일 핸들러를 중복 등록 시 socket.on은 한 번만 호출되어야 한다', async () => {
      const socket = await setupConnectedClient();
      const handler = vi.fn();
      const before = vi.mocked(socket.on).mock.calls.length;

      SocketClient.on('new_chat', handler as any);
      SocketClient.on('new_chat', handler as any); // 중복 등록

      expect(vi.mocked(socket.on).mock.calls.length - before).toBe(1);
    });

    it('on()이 반환하는 함수를 호출하면 핸들러가 제거되어야 한다', async () => {
      const socket = await setupConnectedClient();
      const handler = vi.fn();

      const unsubscribe = SocketClient.on('new_chat', handler as any);
      unsubscribe();

      expect(socket.off).toHaveBeenCalledWith('new_chat', expect.any(Function));
    });

    it('off()에 핸들러를 전달하면 해당 핸들러만 제거해야 한다', async () => {
      const socket = await setupConnectedClient();
      const handler = vi.fn();

      SocketClient.on('new_chat', handler as any);
      SocketClient.off('new_chat', handler as any);

      expect(socket.off).toHaveBeenCalledWith('new_chat', expect.any(Function));
    });

    it('off()를 핸들러 없이 호출하면 해당 이벤트의 모든 리스너를 제거해야 한다', async () => {
      const socket = await setupConnectedClient();

      SocketClient.off('new_chat');

      expect(socket.off).toHaveBeenCalledWith('new_chat');
    });
  });

  describe('emitWithAck()', () => {
    it('URL 미설정 상태에서 호출 시 에러를 throw해야 한다', async () => {
      await expect(SocketClient.emitWithAck('leave_room')).rejects.toThrow(
        '소켓 URL이 설정되지 않음',
      );
    });

    it('성공 응답(success: true) 시 결과를 반환해야 한다', async () => {
      const socket = await setupConnectedClient();
      const mockResponse = { success: true as const };
      vi.mocked(socket.emitWithAck).mockResolvedValue(mockResponse);

      const result = await SocketClient.emitWithAck('leave_room');

      expect(result).toEqual(mockResponse);
      expect(socket.timeout).toHaveBeenCalled();
    });

    it('실패 응답(success: false) 시 SocketError를 throw해야 한다', async () => {
      const socket = await setupConnectedClient();
      vi.mocked(socket.emitWithAck).mockResolvedValue({ success: false, error: 'UNAUTHORIZED' });

      await expect(SocketClient.emitWithAck('leave_room')).rejects.toBeInstanceOf(SocketError);
    });

    it('SocketError에 이벤트 이름과 서버 응답이 포함되어야 한다', async () => {
      const socket = await setupConnectedClient();
      const mockFailResponse = { success: false, error: 'UNAUTHORIZED' };
      vi.mocked(socket.emitWithAck).mockResolvedValue(mockFailResponse);

      try {
        await SocketClient.emitWithAck('leave_room');
        expect.fail('SocketError가 발생해야 함');
      } catch (err) {
        expect(err).toBeInstanceOf(SocketError);
        expect((err as SocketError).event).toBe('leave_room');
        expect((err as SocketError).response).toEqual(mockFailResponse);
      }
    });

    it('네트워크 에러 발생 시 일반 Error로 래핑하여 throw해야 한다', async () => {
      const socket = await setupConnectedClient();
      vi.mocked(socket.emitWithAck).mockRejectedValue(new Error('network error'));

      await expect(SocketClient.emitWithAck('leave_room')).rejects.toThrow('network error');
    });
  });

  describe('disconnect()', () => {
    it('disconnect() 후 getSocket()은 null을 반환해야 한다', async () => {
      await setupConnectedClient();

      SocketClient.disconnect();

      expect(SocketClient.getSocket()).toBeNull();
    });

    it('disconnect() 시 소켓의 모든 리스너를 제거하고 연결을 해제해야 한다', async () => {
      const socket = await setupConnectedClient();

      SocketClient.disconnect();

      expect(socket.removeAllListeners).toHaveBeenCalled();
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('disconnect() 후 connect() 호출 시 새 연결을 수립해야 한다', async () => {
      await setupConnectedClient();
      SocketClient.disconnect();

      vi.clearAllMocks();
      await setupConnectedClient();

      expect(io).toHaveBeenCalledTimes(1);
    });
  });
});
