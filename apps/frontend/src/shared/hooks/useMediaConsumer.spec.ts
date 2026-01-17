import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaConsumer } from './useMediaConsumer';
import { useMediaTransport } from './useMediaTransport';

// MediaStream 모킹
class MockMediaStream {
  private tracks: unknown[];
  constructor(tracks: unknown[] = []) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
  addTrack(track: unknown) {
    this.tracks.push(track);
  }
}
global.MediaStream = MockMediaStream as unknown as typeof MediaStream;

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

vi.mock('./useMediaTransport', () => ({
  useMediaTransport: vi.fn(),
}));

const createMockConsumer = (overrides = {}) => ({
  id: `consumer-${Math.random().toString(36).slice(2)}`,
  track: {
    kind: 'video',
    id: 'track-id',
    enabled: true,
  },
  close: vi.fn(),
  on: vi.fn(),
  ...overrides,
});

const createMockTransport = (overrides = {}) => ({
  id: `transport-${Math.random().toString(36).slice(2)}`,
  closed: false,
  consume: vi.fn(),
  ...overrides,
});

const createMockDevice = (loaded = true) => ({
  loaded,
  rtpCapabilities: {
    codecs: [],
    headerExtensions: [],
  },
});

const createMockSocket = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

describe('useMediaConsumer', () => {
  let mockCreateTransport: ReturnType<typeof vi.fn>;
  let mockGetRecvTransport: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateTransport = vi.fn();
    mockGetRecvTransport = vi.fn();

    (useMediaTransport as ReturnType<typeof vi.fn>).mockReturnValue({
      createTransport: mockCreateTransport,
      getRecvTransport: mockGetRecvTransport,
      getSendTransport: vi.fn(),
      closeTransports: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('getConsumers()가 빈 Map을 반환해야 한다', () => {
      const { result } = renderHook(() => useMediaConsumer());
      expect(result.current.getConsumers().size).toBe(0);
    });

    it('consumerIds 배열이 비어있어야 한다', () => {
      const { result } = renderHook(() => useMediaConsumer());
      expect(result.current.consumerIds).toEqual([]);
    });
  });

  describe('consume', () => {
    it('Device가 초기화되지 않은 경우 에러를 던져야 한다', async () => {
      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();
      const mockDevice = createMockDevice(false);

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Mediasoup Device가 초기화되지 않았습니다.');
    });

    it('기존 RecvTransport가 없으면 새로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(null);
      mockCreateTransport.mockResolvedValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockCreateTransport).toHaveBeenCalledWith(mockSocket, 'recv');
    });

    it('기존 RecvTransport가 closed 상태이면 새로 생성해야 한다', async () => {
      const mockDevice = createMockDevice();
      const closedTransport = createMockTransport({ closed: true });
      const newTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(closedTransport);
      mockCreateTransport.mockResolvedValue(newTransport);
      newTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockCreateTransport).toHaveBeenCalledWith(mockSocket, 'recv');
    });

    it('기존 RecvTransport가 정상이면 재사용해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('서버에 consume 요청을 올바르게 보내야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'consume',
        {
          transportId: mockTransport.id,
          producerId: 'remote-producer-id',
          rtpCapabilities: mockDevice.rtpCapabilities,
        },
        expect.any(Function),
      );
    });

    it('consume 요청 실패 시 에러를 던져야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();

      mockGetRecvTransport.mockReturnValue(mockTransport);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: false,
            error: '서버 에러 발생',
          });
        }
      });

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('서버 에러 발생');
    });

    it('consume 요청 실패 시 기본 에러 메시지를 사용해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();

      mockGetRecvTransport.mockReturnValue(mockTransport);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: false,
          });
        }
      });

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Consume 요청 실패');
    });

    it('transport.consume이 올바른 파라미터로 호출되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      const consumeResponse = {
        success: true,
        consumerId: 'consumer-123',
        producerId: 'remote-producer-id',
        kind: 'video',
        rtpParameters: { codecs: [] },
      };

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback(consumeResponse);
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockTransport.consume).toHaveBeenCalledWith({
        id: 'consumer-123',
        producerId: 'remote-producer-id',
        kind: 'video',
        rtpParameters: { codecs: [] },
      });
    });

    it('Consumer 생성 후 이벤트 핸들러가 등록되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockConsumer.on).toHaveBeenCalledWith('transportclose', expect.any(Function));
      expect(mockConsumer.on).toHaveBeenCalledWith('producerclose', expect.any(Function));
    });

    it('consume_resume 요청이 올바르게 전송되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'consume_resume',
        { consumerId: mockConsumer.id },
        expect.any(Function),
      );
    });

    it('consume_resume 실패 시 에러를 던져야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: false, error: 'Resume 실패' });
        }
      });

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Resume 실패');
    });

    it('consume_resume 실패 시 기본 에러 메시지를 사용해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: false });
        }
      });

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Resume 실패');
    });

    it('성공 시 consumer와 MediaStream을 반환해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      const consumeResult = await result.current.consume(
        mockDevice as never,
        mockSocket as never,
        'remote-producer-id',
      );

      expect(consumeResult.consumer).toBe(mockConsumer);
      expect(consumeResult.stream).toBeInstanceOf(MediaStream);
    });

    it('성공 시 consumers Map에 저장되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await act(async () => {
        await result.current.consume(
          mockDevice as never,
          mockSocket as never,
          'remote-producer-id',
        );
      });

      expect(result.current.getConsumers().get(mockConsumer.id)).toBe(mockConsumer);
      await waitFor(() => {
        expect(result.current.consumerIds).toContain(mockConsumer.id);
      });
    });

    it('여러 Consumer를 순차적으로 추가할 수 있어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer1 = createMockConsumer();
      const mockConsumer2 = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume
        .mockResolvedValueOnce(mockConsumer1)
        .mockResolvedValueOnce(mockConsumer2);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'consume') {
          const isFirst = data.producerId === 'remote-producer-1';
          callback({
            success: true,
            consumerId: isFirst ? mockConsumer1.id : mockConsumer2.id,
            producerId: data.producerId,
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await act(async () => {
        await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-1');
        await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-2');
      });

      expect(result.current.getConsumers().size).toBe(2);
      await waitFor(() => {
        expect(result.current.consumerIds).toHaveLength(2);
      });
    });
  });

  describe('removeConsumer', () => {
    it('존재하는 Consumer를 제거해야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      expect(result.current.getConsumers().has(mockConsumer.id)).toBe(true);

      act(() => {
        result.current.removeConsumer(mockConsumer.id);
      });

      expect(result.current.getConsumers().has(mockConsumer.id)).toBe(false);
      expect(result.current.consumerIds).not.toContain(mockConsumer.id);
    });

    it('Consumer.close()가 호출되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      act(() => {
        result.current.removeConsumer(mockConsumer.id);
      });

      expect(mockConsumer.close).toHaveBeenCalled();
    });

    it('존재하지 않는 Consumer ID로 호출해도 에러가 발생하지 않아야 한다', () => {
      const { result } = renderHook(() => useMediaConsumer());

      expect(() => {
        act(() => {
          result.current.removeConsumer('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('이벤트 핸들러 동작', () => {
    it('transportclose 이벤트 발생 시 Consumer가 제거되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      const transportCloseCall = mockConsumer.on.mock.calls.find(
        (call: string[]) => call[0] === 'transportclose',
      );
      const transportCloseHandler = transportCloseCall[1];

      act(() => {
        transportCloseHandler();
      });

      expect(result.current.getConsumers().has(mockConsumer.id)).toBe(false);
    });

    it('producerclose 이벤트 발생 시 Consumer가 제거되어야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: mockConsumer.id,
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
        if (event === 'consume_resume') {
          callback({ success: true });
        }
      });

      await result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id');

      const producerCloseCall = mockConsumer.on.mock.calls.find(
        (call: string[]) => call[0] === 'producerclose',
      );
      const producerCloseHandler = producerCloseCall[1];

      act(() => {
        producerCloseHandler();
      });

      expect(result.current.getConsumers().has(mockConsumer.id)).toBe(false);
    });
  });

  describe('에러 처리', () => {
    it('transport.consume 실패 시 에러를 던져야 한다', async () => {
      const mockDevice = createMockDevice();
      const mockTransport = createMockTransport();

      mockGetRecvTransport.mockReturnValue(mockTransport);
      mockTransport.consume.mockRejectedValue(new Error('Consumer 생성 실패'));

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      mockSocket.emit.mockImplementation((event, _data, callback) => {
        if (event === 'consume') {
          callback({
            success: true,
            consumerId: 'consumer-id',
            producerId: 'remote-producer-id',
            kind: 'video',
            rtpParameters: {},
          });
        }
      });

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Consumer 생성 실패');
    });

    it('createTransport 실패 시 에러를 던져야 한다', async () => {
      const mockDevice = createMockDevice();

      mockGetRecvTransport.mockReturnValue(null);
      mockCreateTransport.mockRejectedValue(new Error('Transport 생성 실패'));

      const { result } = renderHook(() => useMediaConsumer());
      const mockSocket = createMockSocket();

      await expect(
        result.current.consume(mockDevice as never, mockSocket as never, 'remote-producer-id'),
      ).rejects.toThrow('Transport 생성 실패');
    });
  });
});
