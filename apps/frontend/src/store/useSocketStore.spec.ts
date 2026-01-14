import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSocketStore } from './useSocketStore';
import { io } from 'socket.io-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      io: { on: vi.fn() },
      connected: false,
      active: true,
    };
    return mockSocketInstance;
  }),
}));

describe('useSocketStore (Edge Cases 포함)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useSocketStore.setState({ socket: null, isConnected: false, reconnectCount: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('연결 및 타임아웃 기본 흐름', () => {
    it('7초 이내 에러 발생 시 대기 후 타임아웃 처리', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      const connectErrorCall = mockSocketInstance.once.mock.calls.find(
        (c: string[]) => c[0] === 'connect_error',
      );
      if (connectErrorCall) connectErrorCall[1](new Error('Transient Error'));

      vi.advanceTimersByTime(3000);
      let isResolved = false;
      connectPromise.then(() => {
        isResolved = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(isResolved).toBe(false);

      vi.advanceTimersByTime(4000);
      await vi.advanceTimersByTimeAsync(0);

      const result = await connectPromise;
      expect(result).toBeNull();
      expect(useSocketStore.getState().isConnected).toBe(false);
    }, 10000);

    it('7초 이내 연결 성공 시 소켓 반환', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      vi.advanceTimersByTime(2000);
      const connectOnceCall = mockSocketInstance.once.mock.calls.find(
        (c: string[]) => c[0] === 'connect',
      );
      const connectOnCall = mockSocketInstance.on.mock.calls.find(
        (c: string[]) => c[0] === 'connect',
      );

      if (connectOnCall) connectOnCall[1]();
      if (connectOnceCall) connectOnceCall[1]();
      await vi.advanceTimersByTimeAsync(0);

      const result = await connectPromise;
      expect(result).not.toBeNull();
      expect(useSocketStore.getState().isConnected).toBe(true);
    });
  });

  describe('엣지 케이스 테스트', () => {
    it('서버가 명시적으로 연결을 거부(active: false)하면 즉시 종료', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      mockSocketInstance.active = false;
      const connectErrorCall = mockSocketInstance.once.mock.calls.find(
        (c: string[]) => c[0] === 'connect_error',
      );

      await vi.advanceTimersByTimeAsync(500);
      if (connectErrorCall) connectErrorCall[1](new Error('Unauthorized'));

      const result = await connectPromise;
      expect(result).toBeNull();
    });

    it('중복 connect 호출 시 인스턴스 단일 생성 보장', async () => {
      const { actions } = useSocketStore.getState();
      actions.connect();
      actions.connect();
      actions.connect();

      expect(vi.mocked(io)).toHaveBeenCalledTimes(1);
    });

    it('연결 시도 중 disconnect 호출 시 정리(Cleanup)', async () => {
      const { actions } = useSocketStore.getState();
      const connectPromise = actions.connect();

      vi.advanceTimersByTime(2000);
      actions.disconnect();

      const disconnectOnceCall = mockSocketInstance.once.mock.calls.find(
        (c: string[]) => c[0] === 'disconnect',
      );
      if (disconnectOnceCall) disconnectOnceCall[1]();

      await vi.advanceTimersByTimeAsync(0);

      const result = await connectPromise;
      expect(result).toBeNull();
      expect(useSocketStore.getState().socket).toBeNull();
    }, 10000);

    it('재연결 시도 횟수 상태 반영 확인', async () => {
      const { actions } = useSocketStore.getState();
      actions.connect();

      const reconnectCall = mockSocketInstance.io.on.mock.calls.find(
        (c: string[]) => c[0] === 'reconnect_attempt',
      );
      if (reconnectCall) reconnectCall[1](3);

      expect(useSocketStore.getState().reconnectCount).toBe(3);
    });
  });
});
