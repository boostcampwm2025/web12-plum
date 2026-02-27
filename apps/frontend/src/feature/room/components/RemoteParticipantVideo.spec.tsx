import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RemoteParticipantVideo } from './RemoteParticipantVideo';
import { useMediaStore, type RemoteStream } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useRemoteMedia } from '../hooks/useRemoteMedia';
import type { MediaType, ParticipantRole } from '@plum/shared-interfaces';

interface MockMediaStoreState {
  remoteStreams: Map<string, RemoteStream>;
}

interface MockUseRemoteMediaReturn {
  consumeRemoteProducer: (data: unknown) => Promise<void>;
  consumeExistingProducers: () => Promise<void>;
  stopConsuming: (participantId: string, type: MediaType) => void;
}

vi.mock('../stores/useMediaStore', () => ({
  useMediaStore: vi.fn(),
  selectRemoteVideoStreamByParticipant:
    (participantId: string) =>
    (state: MockMediaStoreState): MediaStream | null => {
      for (const stream of state.remoteStreams.values()) {
        if (stream.participantId === participantId && stream.type === 'video') {
          return stream.stream;
        }
      }
      return null;
    },
}));

vi.mock('../stores/useRoomStore', () => ({
  useRoomStore: vi.fn(),
}));

vi.mock('../hooks/useRemoteMedia', () => ({
  useRemoteMedia: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { ui: { debug: vi.fn(), warn: vi.fn() } },
}));

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size, className, decorative }: any) => (
    <svg
      data-testid={`icon-${name.replace(/_/g, '-')}`}
      width={size}
      className={className}
      aria-hidden={decorative}
    />
  ),
}));

const mockUseMediaStore = vi.mocked(useMediaStore);
const mockUseRoomStore = vi.mocked(useRoomStore);
const mockUseRemoteMedia = vi.mocked(useRemoteMedia);

describe('RemoteParticipantVideo', () => {
  const mockConsumeRemoteProducer = vi.fn().mockResolvedValue(undefined);
  const mockConsumeExistingProducers = vi.fn().mockResolvedValue(undefined);
  const mockStopConsuming = vi.fn();
  const mockStream: MediaStream = {
    id: 'stream-123',
    getTracks: () => [],
    getVideoTracks: () => [{ readyState: 'live' as MediaStreamTrackState }],
  } as unknown as MediaStream;

  const defaultProps = {
    id: 'participant-1',
    name: '호눅스',
    videoProducerId: 'prod-123',
    participantRole: 'audience' as ParticipantRole,
    shouldConsume: true,
    isCurrentlyVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRemoteMedia.mockReturnValue({
      consumeRemoteProducer: mockConsumeRemoteProducer,
      consumeExistingProducers: mockConsumeExistingProducers,
      stopConsuming: mockStopConsuming,
    } as MockUseRemoteMediaReturn);

    mockUseMediaStore.mockImplementation((selector: any) =>
      selector({ remoteStreams: new Map<string, RemoteStream>() } as MockMediaStoreState),
    );

    mockUseRoomStore.mockImplementation((selector: any) =>
      selector({ participantAudioMuted: new Map() } as Parameters<typeof selector>[0]),
    );
  });

  describe('수신(Consume) 제어 로직', () => {
    it('shouldConsume가 true이면 consumeRemoteProducer 호출', async () => {
      render(<RemoteParticipantVideo {...defaultProps} />);

      await waitFor(() => {
        expect(mockConsumeRemoteProducer).toHaveBeenCalledWith(
          expect.objectContaining({
            participantId: defaultProps.id,
            producerId: defaultProps.videoProducerId,
            type: 'video',
            kind: 'video',
            participantRole: defaultProps.participantRole,
          }),
        );
      });
    });

    it('shouldConsume가 false이면 stopConsuming 호출', () => {
      render(
        <RemoteParticipantVideo
          {...defaultProps}
          shouldConsume={false}
        />,
      );

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });

    it('언마운트 시 stopConsuming 호출', () => {
      const { unmount } = render(<RemoteParticipantVideo {...defaultProps} />);
      unmount();

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });
  });

  describe('비디오 스트림 연결 및 렌더링', () => {
    it('video 요소가 렌더링된다 (기본 side 모드)', () => {
      render(<RemoteParticipantVideo {...defaultProps} />);

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();
      expect(videoElement.autoplay).toBe(true);
      expect(videoElement.muted).toBe(true);
    });

    it('원격 스트림이 있을 때 srcObject 설정 확인', async () => {
      const mockRemoteStreams = new Map([
        [
          'consumer-1',
          {
            participantId: 'participant-1',
            type: 'video' as const,
            stream: mockStream,
            consumerId: 'consumer-1',
          },
        ],
      ]);

      mockUseMediaStore.mockImplementation((selector: any) =>
        selector({ remoteStreams: mockRemoteStreams } as MockMediaStoreState),
      );

      render(<RemoteParticipantVideo {...defaultProps} />);

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      await waitFor(
        () => {
          expect(videoElement.srcObject).toBe(mockStream);
        },
        { timeout: 1000 },
      );
    });

    it('스트림 없음 시 cam-disabled 아이콘 표시', () => {
      render(<RemoteParticipantVideo {...defaultProps} />);
      expect(screen.getByTestId('icon-cam-disabled')).toBeInTheDocument();
    });
  });

  describe('가시성 제어', () => {
    it('isCurrentlyVisible=false 시 display: none', () => {
      const { container } = render(
        <RemoteParticipantVideo
          {...defaultProps}
          isCurrentlyVisible={false}
        />,
      );

      const videoContainer = container.firstElementChild as HTMLElement;
      expect(videoContainer).toHaveStyle({ display: 'none' });
    });
  });

  describe('표시 텍스트', () => {
    it('이름이 표시된다', () => {
      render(<RemoteParticipantVideo {...defaultProps} />);
      expect(screen.getByText('호눅스')).toBeInTheDocument();
    });
  });
});
