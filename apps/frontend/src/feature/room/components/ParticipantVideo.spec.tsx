import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ParticipantVideo } from './ParticipantVideo';
import { useMediaStore, type RemoteStream } from '../stores/useMediaStore';
import { useGestureStore } from '../stores/useGestureStore';
import { useRemoteMedia } from '../hooks/useRemoteMedia';
import type { MediaType, ParticipantRole } from '@plum/shared-interfaces';
import type { VideoDisplayMode } from './ParticipantVideo';

interface MockMediaStoreState {
  remoteStreams: Map<string, RemoteStream>;
}

interface MockGestureState {
  gestureProgress: {
    gesture: string | null;
    progress: number;
  };
}

interface MockUseRemoteMediaReturn {
  consumeRemoteProducer: (data: any) => Promise<void>;
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

vi.mock('../stores/useGestureStore', () => ({
  useGestureStore: vi.fn(),
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
const mockUseGestureStore = vi.mocked(useGestureStore);
const mockUseRemoteMedia = vi.mocked(useRemoteMedia);

describe('ParticipantVideo', () => {
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
    mode: 'side' as VideoDisplayMode,
    videoProducerId: 'prod-123',
    participantRole: 'audience' as ParticipantRole,
    isActive: true,
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

    mockUseGestureStore.mockImplementation((selector: any) =>
      selector({ gestureProgress: { gesture: null, progress: 0 } } as MockGestureState),
    );
  });

  describe('수신(Consume) 제어 로직', () => {
    it('isActive가 true이면 consumeRemoteProducer 호출', async () => {
      render(<ParticipantVideo {...defaultProps} />);

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

    it('isActive가 false이면 stopConsuming 호출', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          isActive={false}
        />,
      );

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });

    it('언마운트 시 stopConsuming 호출', () => {
      const { unmount } = render(<ParticipantVideo {...defaultProps} />);
      unmount();

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });
  });

  describe('비디오 스트림 연결 및 렌더링', () => {
    it('video 요소가 항상 렌더링된다 (side 모드)', () => {
      render(<ParticipantVideo {...defaultProps} />);

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

      render(<ParticipantVideo {...defaultProps} />);

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      await waitFor(
        () => {
          expect(videoElement.srcObject).toBe(mockStream);
        },
        { timeout: 1000 },
      );
    });

    it('스트림 없음 + 카메라 OFF 시 cam-disabled 아이콘 표시', () => {
      render(<ParticipantVideo {...defaultProps} />);
      expect(screen.getByTestId('icon-cam-disabled')).toBeInTheDocument();
    });

    it('카메라 OFF 시 srcObject 정리', async () => {
      const { rerender } = render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentUser={true}
          stream={mockStream}
          isCameraOn={true}
        />,
      );

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      await waitFor(() => {
        expect(videoElement.srcObject).toBe(mockStream);
      });

      rerender(
        <ParticipantVideo
          {...defaultProps}
          isCurrentUser={true}
          stream={mockStream}
          isCameraOn={false}
        />,
      );

      await waitFor(() => {
        expect(videoElement.srcObject).toBeNull();
      });
    });

    it('모드 변경 시 이벤트 리스너 정리', async () => {
      const addSpy = vi.spyOn(HTMLVideoElement.prototype, 'addEventListener');
      const removeSpy = vi.spyOn(HTMLVideoElement.prototype, 'removeEventListener');

      try {
        const { rerender } = render(
          <ParticipantVideo
            {...defaultProps}
            isCurrentUser={true}
            stream={mockStream}
            isCameraOn={true}
            mode="side"
          />,
        );

        await waitFor(() => {
          expect(addSpy.mock.calls.some(([eventName]) => String(eventName) === 'loadeddata')).toBe(
            true,
          );
        });

        rerender(
          <ParticipantVideo
            {...defaultProps}
            isCurrentUser={true}
            stream={mockStream}
            isCameraOn={true}
            mode="minimize"
          />,
        );

        await waitFor(() => {
          expect(
            removeSpy.mock.calls.some(([eventName]) => String(eventName) === 'loadeddata'),
          ).toBe(true);
        });
      } finally {
        addSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });

    it('minimize 모드에서는 video 요소 없음', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
        />,
      );

      expect(document.querySelector('video')).not.toBeInTheDocument();
    });
  });

  describe('가시성 제어', () => {
    it('isCurrentlyVisible=false 시 display: none', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentlyVisible={false}
        />,
      );

      const videoContainer = container.firstElementChild as HTMLElement;
      expect(videoContainer).toHaveStyle({ display: 'none' });
    });
  });

  describe('제스처 프로그레스 오버레이', () => {
    it('gesture 없을 때 오버레이 없음', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentUser={true}
          mode="side"
        />,
      );

      expect(screen.queryByTestId('icon-thumbs-up')).not.toBeInTheDocument();
    });
  });

  describe('모드별 UI 및 버튼 동작', () => {
    it('minimize 모드에서 확대 버튼 + 클릭 동작', () => {
      const onModeChange = vi.fn();
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
          isCurrentUser={true}
          onModeChange={onModeChange}
        />,
      );

      expect(screen.getByLabelText('확대')).toBeInTheDocument();
      expect(screen.getByTestId('icon-maximize')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('확대'));
      expect(onModeChange).toHaveBeenCalledWith('pip');
    });

    it('이름이 모든 모드에서 표시', () => {
      render(<ParticipantVideo {...defaultProps} />);
      expect(screen.getByText('호눅스')).toBeInTheDocument();
    });
  });
});
