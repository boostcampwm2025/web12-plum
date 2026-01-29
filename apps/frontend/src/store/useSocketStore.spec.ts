import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketDomainError, useSocketStore } from './useSocketStore';
import { io } from 'socket.io-client';

let mockSocketInstance: any;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    mockSocketInstance = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      io: {
        on: vi.fn(),
        off: vi.fn(),
      },
      connected: false,
      active: true,
      id: null,
    };
    return mockSocketInstance;
  }),
}));

describe('useSocketStore (전체 동작 검증)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSocketInstance = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      io: { on: vi.fn(), off: vi.fn() },
      connected: false,
      active: true,
      id: null,
    };
    vi.mocked(io).mockReturnValue(mockSocketInstance);

    useSocketStore.setState({ socket: null, isConnected: false, reconnectCount: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('connect() 동작 검증', () => {
    it('이미 연결된 소켓이 있으면 즉시 반환', async () => {
      mockSocketInstance.connected = true;
      mockSocketInstance.id = 'existing-socket';

      useSocketStore.setState({
        socket: mockSocketInstance as any,
        isConnected: true,
      });

      const { actions } = useSocketStore.getState();
      const result = await actions.connect();

      expect(result).toBe(mockSocketInstance);
      expect(vi.mocked(io)).not.toHaveBeenCalled();
    }, 10000);

    it('신규 연결 성공 시 소켓 반환 및 상태 업데이트', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      expect(mockSocketInstance.connect).toHaveBeenCalledTimes(1);

      const connectOnceHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );
      const connectOnHandlers = mockSocketInstance.on.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );

      connectOnceHandlers.forEach((call: any[]) => call[1]?.());
      connectOnHandlers.forEach((call: any[]) => call[1]?.());

      mockSocketInstance.id = 'test-socket-id';

      await vi.runAllTimersAsync();

      const result = await connectPromise;
      expect(result).toBe(mockSocketInstance);
      expect(useSocketStore.getState().isConnected).toBe(true);
      expect(useSocketStore.getState().socket).toBe(mockSocketInstance);
    }, 10000);

    it('연결 타임아웃(7초) 발생 시 SocketDomainError throw', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect().catch((err) => err);

      await vi.advanceTimersByTimeAsync(7000);

      const error = await connectPromise;
      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'CONNECTION_TIMEOUT' });
      expect(useSocketStore.getState().isConnected).toBe(false);
    }, 10000);

    it('서버 명시적 거부(active: false) 시 CONNECTION_REJECTED 에러 즉시 throw', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect().catch((err) => err);

      mockSocketInstance.active = false;

      const connectErrorOnceHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect_error',
      );

      connectErrorOnceHandlers.forEach((call: any[]) => call[1]?.(new Error('Unauthorized')));

      await vi.advanceTimersByTimeAsync(100);

      const error = await connectPromise;
      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'CONNECTION_REJECTED' });
    }, 10000);

    it('연결 중 disconnect 호출 시 DISCONNECTED 에러 throw', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect().catch((err) => err);

      vi.advanceTimersByTime(1000);
      actions.disconnect();

      const disconnectOnceHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'disconnect',
      );
      disconnectOnceHandlers.forEach((call: any[]) => call[1]?.());

      const error = await connectPromise;
      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'DISCONNECTED' });
      expect(useSocketStore.getState().socket).toBeNull();
    }, 10000);
  });

  describe('disconnect() 동작 검증', () => {
    it('연결된 소켓 정리 및 상태 초기화', () => {
      mockSocketInstance.connected = true;
      useSocketStore.setState({
        socket: mockSocketInstance as any,
        isConnected: true,
        reconnectCount: 5,
      });

      const { actions } = useSocketStore.getState();
      actions.disconnect();

      expect(mockSocketInstance.removeAllListeners).toHaveBeenCalled();
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(useSocketStore.getState()).toEqual({
        socket: null,
        isConnected: false,
        reconnectCount: 0,
        actions: expect.any(Object),
      });
    });
  });

  describe('상태 이벤트 리스너 검증', () => {
    it('disconnect 이벤트 발생 시 isConnected false로 설정', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      // 연결 성공 시뮬레이션
      const connectHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );
      connectHandlers.forEach((call: any[]) => call[1]?.());
      mockSocketInstance.connected = true;

      await connectPromise;

      const disconnectHandlers = mockSocketInstance.on.mock.calls.filter(
        (c: string[]) => c[0] === 'disconnect',
      );
      disconnectHandlers.forEach((call: any[]) => call[1]?.('manual disconnect'));

      expect(useSocketStore.getState().isConnected).toBe(false);
    });

    it('connect_error (active: true) 발생 시 isConnected false 설정', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      const connectHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );
      connectHandlers.forEach((call: any[]) => call[1]?.());
      mockSocketInstance.connected = true;

      await connectPromise;

      const connectErrorHandlers = mockSocketInstance.on.mock.calls.filter(
        (c: string[]) => c[0] === 'connect_error',
      );
      connectErrorHandlers.forEach((call: any[]) => call[1]?.(new Error('Network error')));

      expect(useSocketStore.getState().isConnected).toBe(false);
    });

    it('reconnect_attempt 이벤트 발생 시 reconnectCount 업데이트', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      const connectHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );
      connectHandlers.forEach((call: any[]) => call[1]?.());

      await connectPromise;

      const reconnectHandlers = mockSocketInstance.io.on.mock.calls.filter(
        (c: string[]) => c[0] === 'reconnect_attempt',
      );
      reconnectHandlers.forEach((call: any[]) => call[1]?.(3));

      expect(useSocketStore.getState().reconnectCount).toBe(3);
    });
  });

  describe('emitWithAck() 동작 검증', () => {
    beforeEach(() => {
      vi.useRealTimers();
      mockSocketInstance.connected = true;
      mockSocketInstance.emit.mockReset();
      useSocketStore.setState({
        socket: mockSocketInstance as any,
        isConnected: true,
      });
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it('소켓 미연결 시 SOCKET_NOT_CONNECTED 에러 throw', async () => {
      useSocketStore.setState({ socket: mockSocketInstance as any, isConnected: false });
      mockSocketInstance.connected = false;

      const { actions } = useSocketStore.getState();

      const error = await actions
        .emitWithAck({
          domain: 'room',
          event: 'test' as any,
        })
        .catch((err) => err);

      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'SOCKET_NOT_CONNECTED' });
    });

    it('ACK 성공 응답 수신 시 Promise resolve', async () => {
      const { actions } = useSocketStore.getState();
      mockSocketInstance.emit.mockImplementationOnce((event: string, callback: any) => {
        setTimeout(() => callback({ success: true, data: 'success' }), 100);
      });

      const result = await actions.emitWithAck({
        domain: 'room',
        event: 'test' as any,
      });

      expect(result).toEqual({ success: true, data: 'success' });
      expect(mockSocketInstance.emit).toHaveBeenCalledTimes(1);
    });

    it('payload 포함 ACK 성공 응답 수신', async () => {
      const { actions } = useSocketStore.getState();

      mockSocketInstance.emit.mockImplementationOnce(
        (event: string, payload: any, callback: any) => {
          setTimeout(() => callback({ success: true, data: 'success' }), 100);
        },
      );

      const result = await actions.emitWithAck({
        domain: 'room',
        event: 'test' as any,
        payload: { test: 'data' } as any,
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith(
        'test',
        { test: 'data' },
        expect.any(Function),
      );
      expect(result).toEqual({ success: true, data: 'success' });
    });

    it('ACK 에러 응답 수신 시 SocketDomainError throw', async () => {
      const { actions } = useSocketStore.getState();

      mockSocketInstance.emit.mockImplementationOnce((event: string, callback: any) => {
        setTimeout(() => callback({ success: false, error: 'VALIDATION_ERROR' }), 100);
      });

      const error = await actions
        .emitWithAck({
          domain: 'room',
          event: 'test' as any,
        })
        .catch((err) => err);

      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'VALIDATION_ERROR' });
    }, 5000);

    it('ACK 타임아웃 시 ACK_TIMEOUT 에러 throw', async () => {
      vi.useFakeTimers();

      const { actions } = useSocketStore.getState();

      mockSocketInstance.emit.mockImplementationOnce(() => {});

      const promise = actions
        .emitWithAck({
          domain: 'room',
          event: 'test' as any,
        })
        .catch((err) => err);

      await vi.advanceTimersByTimeAsync(7000);

      const error = await promise;
      expect(error).toBeInstanceOf(SocketDomainError);
      expect(error).toMatchObject({ code: 'ACK_TIMEOUT' });

      vi.useRealTimers();
    }, 10000);
  });

  describe('중복 및 경쟁 조건 테스트', () => {
    it('중복 connect 호출 시 단일 인스턴스 보장', async () => {
      const { actions } = useSocketStore.getState();

      const promises = [actions.connect(), actions.connect(), actions.connect()];

      expect(vi.mocked(io)).toHaveBeenCalledTimes(1);

      const connectHandlers = mockSocketInstance.once.mock.calls.filter(
        (c: string[]) => c[0] === 'connect',
      );
      connectHandlers.forEach((call: any[]) => call[1]?.());

      await Promise.allSettled(promises);

      expect(useSocketStore.getState().socket).toBe(mockSocketInstance);
    }, 10000);
  });
});
