import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { useMediaProducer } from './useMediaProducer';
import type { Transport, Producer } from 'mediasoup-client/types';
import type { MediaType } from '@plum/shared-interfaces';

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

const createMockTransport = (overrides = {}): Mocked<Transport> =>
  ({
    id: `transport-${Math.random().toString(36).slice(2)}`,
    closed: false,
    produce: vi.fn(),
    ...overrides,
  }) as unknown as Mocked<Transport>;

const createMockProducer = (overrides = {}): Mocked<Producer> =>
  ({
    id: `producer-${Math.random().toString(36).slice(2)}`,
    kind: 'video' as MediaType,
    track: { id: 'track-1' } as MediaStreamTrack,
    appData: { type: 'video' as MediaType },
    closed: false,
    on: vi.fn(),
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    replaceTrack: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as Mocked<Producer>;

const createMockTrack = (overrides = {}): MediaStreamTrack =>
  ({
    id: `track-${Math.random().toString(36).slice(2)}`,
    kind: 'video' as MediaType,
    readyState: 'live' as MediaStreamTrackState,
    ...overrides,
  }) as unknown as MediaStreamTrack;

describe('useMediaProducer', () => {
  let mockTransport: Mocked<Transport>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport = createMockTransport();
  });

  describe('초기 상태', () => {
    it('activeProducers와 producerCount가 초기화되어야 한다', () => {
      const { result } = renderHook(() => useMediaProducer());
      expect(result.current.activeProducers).toEqual({ video: false, audio: false });
      expect(result.current.producerCount).toBe(0);
    });
  });

  describe('produce', () => {
    it('유효하지 않은 트랙 상태면 에러를 던져야 한다', async () => {
      const { result } = renderHook(() => useMediaProducer());
      const invalidTrack = createMockTrack({ readyState: 'ended' });

      await expect(
        result.current.produce(mockTransport, invalidTrack, { type: 'video' }),
      ).rejects.toThrow('유효하지 않은 트랙 상태');
    });

    it('동일한 type의 Producer가 있고 트랙이 다르면 replaceTrack을 호출해야 한다', async () => {
      const existingProducer = createMockProducer({
        track: { id: 'old-track' } as MediaStreamTrack,
      });
      mockTransport.produce.mockResolvedValue(existingProducer);

      const { result } = renderHook(() => useMediaProducer());
      const oldTrack = createMockTrack({ id: 'old-track' });
      const newTrack = createMockTrack({ id: 'new-track' });

      await result.current.produce(mockTransport, oldTrack, { type: 'video' });
      await result.current.produce(mockTransport, newTrack, { type: 'video' });

      expect(mockTransport.produce).toHaveBeenCalledTimes(1);
      expect(existingProducer.replaceTrack).toHaveBeenCalledWith({ track: newTrack });
    });
  });

  describe('togglePause', () => {
    it('pause와 resume을 올바르게 호출해야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      await result.current.produce(mockTransport, createMockTrack(), { type: 'video' });

      result.current.togglePause('video', true);
      expect(mockProducer.pause).toHaveBeenCalled();

      result.current.togglePause('video', false);
      expect(mockProducer.resume).toHaveBeenCalled();
    });
  });

  describe('stopProducing & stopAll', () => {
    it('stopProducing은 해당 kind의 Producer만 닫아야 한다', async () => {
      const videoProducer = createMockProducer({ kind: 'video', appData: { type: 'video' } });
      const audioProducer = createMockProducer({ kind: 'audio', appData: { type: 'audio' } });
      mockTransport.produce
        .mockResolvedValueOnce(videoProducer)
        .mockResolvedValueOnce(audioProducer);

      const { result } = renderHook(() => useMediaProducer());

      await result.current.produce(mockTransport, createMockTrack({ kind: 'video' }), {
        type: 'video',
      });
      await result.current.produce(mockTransport, createMockTrack({ kind: 'audio' }), {
        type: 'audio',
      });

      result.current.stopProducing('video');

      expect(videoProducer.close).toHaveBeenCalled();
      expect(audioProducer.close).not.toHaveBeenCalled();
    });

    it('stopAll은 모든 Producer를 닫아야 한다', async () => {
      const p1 = createMockProducer();
      const p2 = createMockProducer();
      mockTransport.produce.mockResolvedValueOnce(p1).mockResolvedValueOnce(p2);

      const { result } = renderHook(() => useMediaProducer());

      await result.current.produce(mockTransport, createMockTrack(), { type: 'video' });
      await result.current.produce(mockTransport, createMockTrack(), { type: 'audio' });

      result.current.stopAll();

      expect(p1.close).toHaveBeenCalled();
      expect(p2.close).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.producerCount).toBe(0);
      });
    });
  });
});
