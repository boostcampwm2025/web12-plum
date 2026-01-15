import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaTransport } from './useMediaTransport';
import { useMediaDeviceStore } from '../../store/useMediaDeviceStore';

// Mock logger
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    media: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const createMockTransport = (overrides = {}) => ({
  id: `transport-${Math.random().toString(36).slice(2)}`,
  closed: false,
  connectionState: 'new' as const,
  on: vi.fn(),
  close: vi.fn(),
  ...overrides,
});

const createMockDevice = (loaded = true) => ({
  loaded,
  createSendTransport: vi.fn(() => createMockTransport()),
  createRecvTransport: vi.fn(() => createMockTransport()),
});

const createMockSocket = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

describe('useMediaTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMediaDeviceStore.setState({
      device: null,
      isLoaded: false,
      isInitializing: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransport', () => {
    it('Device가 로드되지 않은 경우 에러를 던져야 한다', async () => {
      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      await expect(result.current.createTransport(mockSocket as never, 'send')).rejects.toThrow(
        'Mediasoup Device가 로드되지 않았습니다',
      );
    });

    it('send Transport를 성공적으로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      // 서버 응답 시뮬레이션
      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      const transport = await result.current.createTransport(mockSocket as never, 'send');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'create_transport',
        { direction: 'send' },
        expect.any(Function),
      );
      expect(mockDevice.createSendTransport).toHaveBeenCalled();
      expect(transport).toBe(mockTransport);
    });

    it('recv Transport를 성공적으로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createRecvTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      const transport = await result.current.createTransport(mockSocket as never, 'recv');

      expect(mockDevice.createRecvTransport).toHaveBeenCalled();
      expect(transport).toBe(mockTransport);
    });

    it('서버에서 에러 응답 시 reject되어야 한다', async () => {
      const mockDevice = createMockDevice();
      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: false,
            error: '서버 에러 발생',
          });
        }
      });

      await expect(result.current.createTransport(mockSocket as never, 'send')).rejects.toThrow(
        '서버 에러 발생',
      );
    });

    it('이미 존재하는 Transport가 있으면 재사용해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      // 첫 번째 호출
      const transport1 = await result.current.createTransport(mockSocket as never, 'send');

      // 두 번째 호출 - 기존 Transport 재사용
      const transport2 = await result.current.createTransport(mockSocket as never, 'send');

      expect(transport1).toBe(transport2);
      expect(mockDevice.createSendTransport).toHaveBeenCalledTimes(1);
    });

    it('closed 상태인 Transport는 새로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const closedTransport = createMockTransport({ closed: true });
      const newTransport = createMockTransport();

      mockDevice.createSendTransport
        .mockReturnValueOnce(closedTransport)
        .mockReturnValueOnce(newTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      // 첫 번째 호출 - closed 상태의 Transport 생성
      await result.current.createTransport(mockSocket as never, 'send');

      // 두 번째 호출 - closed 상태이므로 새로 생성해야 함
      const transport2 = await result.current.createTransport(mockSocket as never, 'send');

      expect(mockDevice.createSendTransport).toHaveBeenCalledTimes(2);
      expect(transport2).toBe(newTransport);
    });

    it('failed 상태인 Transport는 새로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const failedTransport = createMockTransport({ connectionState: 'failed' });
      const newTransport = createMockTransport();

      mockDevice.createSendTransport
        .mockReturnValueOnce(failedTransport)
        .mockReturnValueOnce(newTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');
      const transport2 = await result.current.createTransport(mockSocket as never, 'send');

      expect(mockDevice.createSendTransport).toHaveBeenCalledTimes(2);
      expect(transport2).toBe(newTransport);
    });

    it('동시에 여러 번 호출해도 중복 생성되지 않아야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      const callbackHolder: { resolve: ((value: unknown) => void) | null } = { resolve: null };

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          // 콜백을 지연시켜 동시 호출 시뮬레이션
          callbackHolder.resolve = callback;
        }
      });

      // 동시에 3번 호출
      const promise1 = result.current.createTransport(mockSocket as never, 'send');
      const promise2 = result.current.createTransport(mockSocket as never, 'send');
      const promise3 = result.current.createTransport(mockSocket as never, 'send');

      // 서버 응답 시뮬레이션
      callbackHolder.resolve?.({
        success: true,
        id: 'server-transport-id',
        iceParameters: {},
        iceCandidates: [],
        dtlsParameters: {},
      });

      const [transport1, transport2, transport3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // 모든 결과가 동일한 Transport여야 함
      expect(transport1).toBe(transport2);
      expect(transport2).toBe(transport3);
      // emit은 한 번만 호출되어야 함
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });

    it('Transport 생성 시 connect 이벤트 핸들러가 등록되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      expect(mockTransport.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockTransport.on).toHaveBeenCalledWith('connectionstatechange', expect.any(Function));
    });

    it('send Transport 생성 시 produce 이벤트 핸들러가 등록되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      expect(mockTransport.on).toHaveBeenCalledWith('produce', expect.any(Function));
    });

    it('recv Transport 생성 시 produce 이벤트 핸들러가 등록되지 않아야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createRecvTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'recv');

      const produceCalls = mockTransport.on.mock.calls.filter(
        (call: string[]) => call[0] === 'produce',
      );
      expect(produceCalls).toHaveLength(0);
    });
  });

  describe('closeTransports', () => {
    it('모든 Transport를 정리해야 한다', async () => {
      const mockDevice = createMockDevice();
      const sendTransport = createMockTransport();
      const recvTransport = createMockTransport();

      mockDevice.createSendTransport.mockReturnValue(sendTransport);
      mockDevice.createRecvTransport.mockReturnValue(recvTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      // Transport 생성
      await result.current.createTransport(mockSocket as never, 'send');
      await result.current.createTransport(mockSocket as never, 'recv');

      // closeTransports 호출
      act(() => {
        result.current.closeTransports();
      });

      expect(sendTransport.close).toHaveBeenCalled();
      expect(recvTransport.close).toHaveBeenCalled();
    });

    it('closeTransports 후 getSendTransport와 getRecvTransport는 null을 반환해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');
      expect(result.current.getSendTransport()).toBe(mockTransport);

      act(() => {
        result.current.closeTransports();
      });

      expect(result.current.getSendTransport()).toBeNull();
      expect(result.current.getRecvTransport()).toBeNull();
    });

    it('Transport가 없는 상태에서 closeTransports 호출해도 에러가 발생하지 않아야 한다', () => {
      const { result } = renderHook(() => useMediaTransport());

      expect(() => {
        act(() => {
          result.current.closeTransports();
        });
      }).not.toThrow();
    });
  });

  describe('getter 함수들', () => {
    it('초기 상태에서 getSendTransport는 null을 반환해야 한다', () => {
      const { result } = renderHook(() => useMediaTransport());
      expect(result.current.getSendTransport()).toBeNull();
    });

    it('초기 상태에서 getRecvTransport는 null을 반환해야 한다', () => {
      const { result } = renderHook(() => useMediaTransport());
      expect(result.current.getRecvTransport()).toBeNull();
    });
  });

  describe('이벤트 핸들러 동작', () => {
    it('connect 이벤트 핸들러가 DTLS 연결을 처리해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
        if (event === 'connect_transport') {
          callback({ success: true });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      // connect 이벤트 핸들러 가져오기
      const connectCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'connect',
      );
      const connectHandler = connectCall[1];

      // connect 이벤트 시뮬레이션
      const mockCallback = vi.fn();
      const mockErrback = vi.fn();
      const mockDtlsParameters = { fingerprints: [] };

      connectHandler({ dtlsParameters: mockDtlsParameters }, mockCallback, mockErrback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connect_transport',
        { transportId: mockTransport.id, dtlsParameters: mockDtlsParameters },
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalled();
      expect(mockErrback).not.toHaveBeenCalled();
    });

    it('connect 이벤트 실패 시 errback이 호출되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
        if (event === 'connect_transport') {
          callback({ success: false, error: 'DTLS 연결 실패' });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      const connectCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'connect',
      );
      const connectHandler = connectCall[1];

      const mockCallback = vi.fn();
      const mockErrback = vi.fn();

      connectHandler({ dtlsParameters: {} }, mockCallback, mockErrback);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockErrback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('produce 이벤트 핸들러가 서버에 Producer 생성을 요청해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
        if (event === 'produce') {
          callback({ success: true, producerId: 'producer-id' });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      const produceCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'produce',
      );
      const produceHandler = produceCall[1];

      const mockCallback = vi.fn();
      const mockErrback = vi.fn();
      const mockRtpParameters = { codecs: [] };

      await produceHandler(
        { kind: 'video', rtpParameters: mockRtpParameters, appData: { type: 'video' } },
        mockCallback,
        mockErrback,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'produce',
        {
          transportId: mockTransport.id,
          type: 'video',
          rtpParameters: mockRtpParameters,
        },
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalledWith({ id: 'producer-id' });
    });

    it('produce 이벤트 실패 시 errback이 호출되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
        if (event === 'produce') {
          callback({ success: false, error: 'Producer 생성 실패' });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');

      const produceCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'produce',
      );
      const produceHandler = produceCall[1];

      const mockCallback = vi.fn();
      const mockErrback = vi.fn();

      await produceHandler(
        { kind: 'video', rtpParameters: {}, appData: { type: 'video' } },
        mockCallback,
        mockErrback,
      );

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockErrback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('connectionstatechange 이벤트에서 failed 상태가 되면 Transport ref가 null이 되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createSendTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'send');
      expect(result.current.getSendTransport()).toBe(mockTransport);

      // connectionstatechange 이벤트 핸들러 가져오기
      const stateChangeCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'connectionstatechange',
      );
      const stateChangeHandler = stateChangeCall[1];

      // failed 상태로 변경
      act(() => {
        stateChangeHandler('failed');
      });

      expect(result.current.getSendTransport()).toBeNull();
    });

    it('connectionstatechange 이벤트에서 closed 상태가 되면 Transport ref가 null이 되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      mockDevice.createRecvTransport.mockReturnValue(mockTransport);

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await result.current.createTransport(mockSocket as never, 'recv');
      expect(result.current.getRecvTransport()).toBe(mockTransport);

      const stateChangeCall = mockTransport.on.mock.calls.find(
        (call: string[]) => call[0] === 'connectionstatechange',
      );
      const stateChangeHandler = stateChangeCall[1];

      act(() => {
        stateChangeHandler('closed');
      });

      expect(result.current.getRecvTransport()).toBeNull();
    });
  });

  describe('Device 인스턴스 생성 오류 처리', () => {
    it('Device.createSendTransport에서 오류 발생 시 reject되어야 한다', async () => {
      const mockDevice = createMockDevice();
      mockDevice.createSendTransport.mockImplementation(() => {
        throw new Error('Transport 생성 실패');
      });

      useMediaDeviceStore.setState({ device: mockDevice as never, isLoaded: true });

      const { result } = renderHook(() => useMediaTransport());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'create_transport') {
          callback({
            success: true,
            id: 'server-transport-id',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {},
          });
        }
      });

      await expect(result.current.createTransport(mockSocket as never, 'send')).rejects.toThrow(
        'Transport 생성 실패',
      );
    });
  });
});
