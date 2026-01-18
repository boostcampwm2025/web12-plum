import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const createMockProducer = (overrides = {}) => ({
  id: `producer-${Math.random().toString(36).slice(2)}`,
  kind: 'video' as const,
  track: { id: 'track-1' },
  appData: { type: 'video' },
  closed: false,
  on: vi.fn(),
  close: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  replaceTrack: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createMockTrack = (overrides = {}) => ({
  id: `track-${Math.random().toString(36).slice(2)}`,
  kind: 'video' as const,
  readyState: 'live' as const,
  ...overrides,
});

describe('useMediaProducer', () => {
  let mockTransport: any;

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
        result.current.produce(mockTransport, invalidTrack as any, { type: 'video' }),
      ).rejects.toThrow('유효하지 않은 트랙 상태');
    });

    it('동일한 type의 Producer가 있고 트랙이 다르면 replaceTrack을 호출해야 한다', async () => {
      const existingProducer = createMockProducer({ track: { id: 'old-track' } });
      mockTransport.produce.mockResolvedValue(existingProducer);

      const { result } = renderHook(() => useMediaProducer());
      const oldTrack = createMockTrack({ id: 'old-track' });
      const newTrack = createMockTrack({ id: 'new-track' });

      await act(async () => {
        await result.current.produce(mockTransport, oldTrack as any, { type: 'video' });
      });

      await act(async () => {
        await result.current.produce(mockTransport, newTrack as any, { type: 'video' });
      });

      expect(mockTransport.produce).toHaveBeenCalledTimes(1);
      expect(existingProducer.replaceTrack).toHaveBeenCalledWith({ track: newTrack });
    });
  });

  describe('togglePause', () => {
    it('pause와 resume을 올바르게 호출해야 한다', async () => {
      const mockProducer = createMockProducer();
      mockTransport.produce.mockResolvedValue(mockProducer);

      const { result } = renderHook(() => useMediaProducer());
      await act(async () => {
        await result.current.produce(mockTransport, createMockTrack() as any, { type: 'video' });
      });

      act(() => {
        result.current.togglePause('video', true);
      });
      expect(mockProducer.pause).toHaveBeenCalled();

      act(() => {
        result.current.togglePause('video', false);
      });
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
      await act(async () => {
        await result.current.produce(mockTransport, createMockTrack({ kind: 'video' }) as any, {
          type: 'video',
        });
        await result.current.produce(mockTransport, createMockTrack({ kind: 'audio' }) as any, {
          type: 'audio',
        });
      });

      act(() => {
        result.current.stopProducing('video');
      });
      expect(videoProducer.close).toHaveBeenCalled();
      expect(audioProducer.close).not.toHaveBeenCalled();
    });

    it('stopAll은 모든 Producer를 닫아야 한다', async () => {
      const p1 = createMockProducer();
      const p2 = createMockProducer();
      mockTransport.produce.mockResolvedValueOnce(p1).mockResolvedValueOnce(p2);

      const { result } = renderHook(() => useMediaProducer());
      await act(async () => {
        await result.current.produce(mockTransport, createMockTrack() as any, { type: 'video' });
        await result.current.produce(mockTransport, createMockTrack() as any, { type: 'audio' });
      });

      act(() => {
        result.current.stopAll();
      });
      expect(p1.close).toHaveBeenCalled();
      expect(p2.close).toHaveBeenCalled();
      expect(result.current.producerCount).toBe(0);
    });
  });
});
