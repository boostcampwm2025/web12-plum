import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaConsumer } from './useMediaConsumer';
import { ConsumerSignaling } from './ConsumerSignaling';
import type {
  Device,
  Transport,
  Consumer,
  RtpCapabilities,
  ConsumerOptions,
} from 'mediasoup-client/types';
import type { MediaSocket } from '../types';

global.MediaStream = vi.fn().mockImplementation((tracks: MediaStreamTrack[]) => ({
  getTracks: () => tracks,
  addTrack: vi.fn(),
})) as unknown as typeof MediaStream;

vi.mock('@/shared/lib/logger', () => ({
  logger: { media: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } },
}));

vi.mock('./ConsumerSignaling', () => ({
  ConsumerSignaling: {
    consume: vi.fn(),
    consumeResume: vi.fn(),
    setupAllHandlers: vi.fn(),
  },
}));

const createMockConsumer = (overrides = {}): Mocked<Consumer> =>
  ({
    id: `consumer-${Math.random().toString(36).slice(2)}`,
    track: { id: 'track-id', kind: 'video' } as unknown as MediaStreamTrack,
    closed: false,
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    on: vi.fn(),
    ...overrides,
  }) as unknown as Mocked<Consumer>;

const createMockTransport = (): Mocked<Transport> =>
  ({
    id: 'transport-id',
    consume: vi.fn(),
  }) as unknown as Mocked<Transport>;

describe('useMediaConsumer', () => {
  const mockSocket = {} as MediaSocket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consume: 미디어 수신 프로세스', () => {
    it('성공 시 Consumer를 저장하고 MediaStream을 생성해야 한다', async () => {
      const { result } = renderHook(() => useMediaConsumer());
      const mockDevice = {
        loaded: true,
        rtpCapabilities: {} as RtpCapabilities,
      } as Device;
      const mockTransport = createMockTransport();
      const mockConsumer = createMockConsumer();

      vi.mocked(ConsumerSignaling.consume).mockResolvedValue({ id: 'c1' } as ConsumerOptions);
      mockTransport.consume.mockResolvedValue(mockConsumer);
      vi.mocked(ConsumerSignaling.consumeResume).mockResolvedValue(undefined);

      await result.current.consume(mockDevice, mockSocket, mockTransport, 'p1');

      await waitFor(() => {
        expect(result.current.consumerIds).toContain(mockConsumer.id);
        expect(result.current.getStream(mockConsumer.id)).toBeDefined();
      });
    });
  });

  describe('toggleConsumer: 일시정지 및 재개', () => {
    it('지정된 ID의 Consumer를 pause/resume 시켜야 한다', async () => {
      const { result } = renderHook(() => useMediaConsumer());
      const mockConsumer = createMockConsumer({ id: 'target-id' });
      const mockTransport = createMockTransport();

      vi.mocked(ConsumerSignaling.consume).mockResolvedValue({} as ConsumerOptions);
      mockTransport.consume.mockResolvedValue(mockConsumer);

      await result.current.consume({ loaded: true } as Device, mockSocket, mockTransport, 'p1');

      result.current.toggleConsumer('target-id', true);
      expect(mockConsumer.pause).toHaveBeenCalled();

      result.current.toggleConsumer('target-id', false);
      expect(mockConsumer.resume).toHaveBeenCalled();
    });
  });

  describe('removeConsumer: 자원 정리', () => {
    it('특정 Consumer를 제거하고 스트림 Map에서도 삭제해야 한다', async () => {
      const { result } = renderHook(() => useMediaConsumer());
      const mockConsumer = createMockConsumer({ id: 'remove-me' });
      const mockTransport = createMockTransport();
      mockTransport.consume.mockResolvedValue(mockConsumer);

      await result.current.consume({ loaded: true } as Device, mockSocket, mockTransport, 'p1');

      result.current.removeConsumer('remove-me');

      await waitFor(() => {
        expect(mockConsumer.close).toHaveBeenCalled();
        expect(result.current.consumerIds).not.toContain('remove-me');
        expect(result.current.getStream('remove-me')).toBeUndefined();
      });
    });
  });

  describe('이벤트 기반 자동 정리', () => {
    it('cleanup 함수가 실행되면 모든 참조가 제거되어야 한다', async () => {
      const { result } = renderHook(() => useMediaConsumer());
      const mockConsumer = createMockConsumer({ id: 'event-target' });
      const mockTransport = createMockTransport();
      mockTransport.consume.mockResolvedValue(mockConsumer);

      await result.current.consume({ loaded: true } as Device, mockSocket, mockTransport, 'p1');

      const setupHandlersMock = vi.mocked(ConsumerSignaling.setupAllHandlers);
      const cleanupCallback = setupHandlersMock.mock.calls[0][1];

      cleanupCallback();

      await waitFor(() => {
        expect(result.current.consumerIds).not.toContain('event-target');
      });
    });
  });
});
