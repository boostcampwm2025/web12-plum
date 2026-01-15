import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaProducer } from './useMediaProducer';

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
  produce: vi.fn(),
  ...overrides,
});

const mockCreateTransport = vi.fn();
const mockGetSendTransport = vi.fn();

vi.mock('./useMediaTransport', () => ({
  useMediaTransport: () => ({
    createTransport: mockCreateTransport,
    getSendTransport: mockGetSendTransport,
  }),
}));

const createMockProducer = (overrides = {}) => ({
  id: `producer-${Math.random().toString(36).slice(2)}`,
  kind: 'video' as const,
  track: { id: 'track-1' },
  appData: { type: 'video' },
  on: vi.fn(),
  close: vi.fn(),
  ...overrides,
});

const createMockTrack = (overrides = {}) => ({
  id: `track-${Math.random().toString(36).slice(2)}`,
  kind: 'video' as const,
  readyState: 'live' as const,
  ...overrides,
});

const createMockSocket = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

describe('useMediaProducer', () => {
  let mockTransport: ReturnType<typeof createMockTransport>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport = createMockTransport();
    mockGetSendTransport.mockReturnValue(null);
    mockCreateTransport.mockResolvedValue(mockTransport);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('activeProducers는 video: false, audio: false여야 한다', () => {
      const { result } = renderHook(() => useMediaProducer());

      expect(result.current.activeProducers).toEqual({ video: false, audio: false });
    });

    it('producerCount는 0이어야 한다', () => {
      const { result } = renderHook(() => useMediaProducer());

      expect(result.current.producerCount).toBe(0);
    });
  });

  describe('produce', () => {
    it('유효하지 않은 트랙 상태면 에러를 던져야 한다', async () => {
      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const invalidTrack = createMockTrack({ readyState: 'ended' });

      await expect(
        result.current.produce(mockSocket as never, invalidTrack as never, { type: 'video' }),
      ).rejects.toThrow('유효하지 않은 트랙 상태');
    });

    it('Transport가 없으면 새로 생성해야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(mockSocket, 'send');
    });

    it('기존 Transport가 있으면 재사용해야 한다', async () => {
      const existingTransport = createMockTransport();
      const mockProducer = createMockProducer();
      existingTransport.produce.mockResolvedValue(mockProducer);
      mockGetSendTransport.mockReturnValue(existingTransport);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockCreateTransport).not.toHaveBeenCalled();
      expect(existingTransport.produce).toHaveBeenCalled();
    });

    it('closed 상태의 Transport는 새로 생성해야 한다', async () => {
      const closedTransport = createMockTransport({ closed: true });
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);
      mockGetSendTransport.mockReturnValue(closedTransport);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(mockSocket, 'send');
    });

    it('produce 성공 시 Producer를 반환해야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      let producer;
      await act(async () => {
        producer = await result.current.produce(mockSocket as never, mockTrack as never, {
          type: 'video',
        });
      });

      expect(producer).toBe(mockProducer);
    });

    it('produce 성공 시 activeProducers가 업데이트되어야 한다', async () => {
      const mockProducer = createMockProducer({ kind: 'video' });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack({ kind: 'video' });

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(result.current.activeProducers.video).toBe(true);
    });

    it('appData.type에 지정된 값으로 produce해야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockTransport.produce).toHaveBeenCalledWith(
        expect.objectContaining({
          appData: expect.objectContaining({ type: 'video' }),
        }),
      );
    });

    it('appData.type을 지정하면 해당 값을 사용해야 한다', async () => {
      const mockProducer = createMockProducer({ appData: { type: 'screen' } });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'screen' });
      });

      expect(mockTransport.produce).toHaveBeenCalledWith(
        expect.objectContaining({
          appData: expect.objectContaining({ type: 'screen' }),
        }),
      );
    });

    it('동일한 type의 Producer가 이미 존재하고 트랙 ID가 같으면 기존 것을 반환해야 한다', async () => {
      const existingProducer = createMockProducer({
        track: { id: 'same-track-id' },
        appData: { type: 'video' },
      });
      mockTransport.produce.mockResolvedValue(existingProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack({ id: 'same-track-id' });

      // 첫 번째 produce
      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      // 동일한 트랙으로 두 번째 produce
      let secondProducer;
      await act(async () => {
        secondProducer = await result.current.produce(mockSocket as never, mockTrack as never, {
          type: 'video',
        });
      });

      expect(secondProducer).toBe(existingProducer);
      // produce는 첫 번째만 호출되어야 함
      expect(mockTransport.produce).toHaveBeenCalledTimes(1);
    });

    it('동일한 type의 Producer가 있지만 트랙 ID가 다르면 기존 것을 닫고 새로 생성해야 한다', async () => {
      const existingProducer = createMockProducer({
        track: { id: 'old-track-id' },
        appData: { type: 'video' },
      });
      const newProducer = createMockProducer({
        track: { id: 'new-track-id' },
        appData: { type: 'video' },
      });

      mockTransport.produce
        .mockResolvedValueOnce(existingProducer)
        .mockResolvedValueOnce(newProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const oldTrack = createMockTrack({ id: 'old-track-id' });
      const newTrack = createMockTrack({ id: 'new-track-id' });

      // 첫 번째 produce
      await act(async () => {
        await result.current.produce(mockSocket as never, oldTrack as never, { type: 'video' });
      });

      // 다른 트랙으로 두 번째 produce
      await act(async () => {
        await result.current.produce(mockSocket as never, newTrack as never, { type: 'video' });
      });

      expect(existingProducer.close).toHaveBeenCalled();
      expect(mockTransport.produce).toHaveBeenCalledTimes(2);
    });

    it('transportclose 이벤트 핸들러가 등록되어야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockProducer.on).toHaveBeenCalledWith('transportclose', expect.any(Function));
    });

    it('trackended 이벤트 핸들러가 등록되어야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(mockProducer.on).toHaveBeenCalledWith('trackended', expect.any(Function));
    });

    it('transport.produce 실패 시 에러를 전파해야 한다', async () => {
      mockTransport.produce.mockRejectedValue(new Error('Produce failed'));

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await expect(
        result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' }),
      ).rejects.toThrow('Produce failed');
    });
  });

  describe('stopProducing', () => {
    it('지정된 kind의 Producer만 중단해야 한다', async () => {
      const videoProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      const audioProducer = createMockProducer({ kind: 'audio', appData: { type: 'audio' } });

      mockTransport.produce
        .mockResolvedValueOnce(videoProducer)
        .mockResolvedValueOnce(audioProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const videoTrack = createMockTrack({ kind: 'video' });
      const audioTrack = createMockTrack({ kind: 'audio' });

      // 두 개의 Producer 생성
      await act(async () => {
        await result.current.produce(mockSocket as never, videoTrack as never, { type: 'video' });
        await result.current.produce(mockSocket as never, audioTrack as never, { type: 'audio' });
      });

      // video만 중단
      act(() => {
        result.current.stopProducing('video');
      });

      expect(videoProducer.close).toHaveBeenCalled();
      expect(audioProducer.close).not.toHaveBeenCalled();
    });

    it('stopProducing 후 activeProducers가 업데이트되어야 한다', async () => {
      const videoProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(videoProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const videoTrack = createMockTrack({ kind: 'video' });

      await act(async () => {
        await result.current.produce(mockSocket as never, videoTrack as never, { type: 'video' });
      });

      expect(result.current.activeProducers.video).toBe(true);

      act(() => {
        result.current.stopProducing('video');
      });

      expect(result.current.activeProducers.video).toBe(false);
    });
  });

  describe('stopAll', () => {
    it('모든 Producer를 중단해야 한다', async () => {
      const videoProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      const audioProducer = createMockProducer({ kind: 'audio', appData: { type: 'audio' } });

      mockTransport.produce
        .mockResolvedValueOnce(videoProducer)
        .mockResolvedValueOnce(audioProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const videoTrack = createMockTrack({ kind: 'video' });
      const audioTrack = createMockTrack({ kind: 'audio' });

      await act(async () => {
        await result.current.produce(mockSocket as never, videoTrack as never, { type: 'video' });
        await result.current.produce(mockSocket as never, audioTrack as never, { type: 'audio' });
      });

      act(() => {
        result.current.stopAll();
      });

      expect(videoProducer.close).toHaveBeenCalled();
      expect(audioProducer.close).toHaveBeenCalled();
    });

    it('stopAll 후 activeProducers가 모두 false가 되어야 한다', async () => {
      const videoProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(videoProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const videoTrack = createMockTrack({ kind: 'video' });

      await act(async () => {
        await result.current.produce(mockSocket as never, videoTrack as never, { type: 'video' });
      });

      act(() => {
        result.current.stopAll();
      });

      expect(result.current.activeProducers).toEqual({ video: false, audio: false });
    });

    it('Producer가 없는 상태에서 stopAll 호출해도 에러가 발생하지 않아야 한다', () => {
      const { result } = renderHook(() => useMediaProducer());

      expect(() => {
        act(() => {
          result.current.stopAll();
        });
      }).not.toThrow();
    });
  });

  describe('getProducer', () => {
    it('존재하는 type의 Producer를 반환해야 한다', async () => {
      const mockProducer = createMockProducer({ appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(result.current.getProducer('video')).toBe(mockProducer);
    });

    it('Producer가 없는 type의 경우 null을 반환해야 한다', () => {
      const { result } = renderHook(() => useMediaProducer());

      expect(result.current.getProducer('screen')).toBeNull();
    });

    it('type 미지정 시 기본값 video로 조회해야 한다', async () => {
      const mockProducer = createMockProducer({ appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(result.current.getProducer()).toBe(mockProducer);
    });
  });

  describe('이벤트 핸들러 동작', () => {
    it('transportclose 이벤트 발생 시 Producer가 정리되어야 한다', async () => {
      const mockProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(result.current.activeProducers.video).toBe(true);

      // transportclose 이벤트 핸들러 찾기 및 호출
      const transportCloseCall = mockProducer.on.mock.calls.find(
        (call: string[]) => call[0] === 'transportclose',
      );
      const transportCloseHandler = transportCloseCall[1];

      act(() => {
        transportCloseHandler();
      });

      expect(mockProducer.close).toHaveBeenCalled();
      expect(result.current.activeProducers.video).toBe(false);
    });

    it('trackended 이벤트 발생 시 Producer가 정리되어야 한다', async () => {
      const mockProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const mockTrack = createMockTrack();

      await act(async () => {
        await result.current.produce(mockSocket as never, mockTrack as never, { type: 'video' });
      });

      expect(result.current.activeProducers.video).toBe(true);

      const trackEndedCall = mockProducer.on.mock.calls.find(
        (call: string[]) => call[0] === 'trackended',
      );
      const trackEndedHandler = trackEndedCall[1];

      act(() => {
        trackEndedHandler();
      });

      expect(mockProducer.close).toHaveBeenCalled();
      expect(result.current.activeProducers.video).toBe(false);
    });
  });

  describe('오디오 Producer', () => {
    it('audio 트랙으로 produce 시 activeProducers.audio가 true가 되어야 한다', async () => {
      const audioProducer = createMockProducer({ kind: 'audio', appData: { type: 'audio' } });
      mockTransport.produce.mockResolvedValue(audioProducer);

      const { result } = renderHook(() => useMediaProducer());
      const mockSocket = createMockSocket();
      const audioTrack = createMockTrack({ kind: 'audio' });

      await act(async () => {
        await result.current.produce(mockSocket as never, audioTrack as never, { type: 'audio' });
      });

      expect(result.current.activeProducers.audio).toBe(true);
      expect(result.current.activeProducers.video).toBe(false);
    });
  });
});
