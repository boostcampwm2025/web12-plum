import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { MyParticipantVideo } from './MyParticipantVideo';
import { useGestureStore } from '../stores/useGestureStore';
import type { VideoDisplayMode } from '../types';

interface MockGestureState {
  gestureProgress: {
    gesture: string | null;
    progress: number;
  };
}

vi.mock('../stores/useGestureStore', () => ({
  useGestureStore: vi.fn(),
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

const mockUseGestureStore = vi.mocked(useGestureStore);

describe('MyParticipantVideo', () => {
  const mockStream: MediaStream = {
    id: 'stream-123',
    getTracks: () => [],
    getVideoTracks: () => [{ readyState: 'live' as MediaStreamTrackState }],
  } as unknown as MediaStream;

  const defaultProps = {
    id: 'participant-1',
    name: '호눅스',
    mode: 'side' as VideoDisplayMode,
    stream: null,
    isCameraOn: false,
    isAudioMuted: false,
    isSpeaking: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGestureStore.mockImplementation((selector: any) =>
      selector({ gestureProgress: { gesture: null, progress: 0 } } as MockGestureState),
    );
  });

  describe('비디오 스트림 연결 및 렌더링', () => {
    it('video 요소가 렌더링된다 (side 모드)', () => {
      render(<MyParticipantVideo {...defaultProps} />);

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();
      expect(videoElement.autoplay).toBe(true);
      expect(videoElement.muted).toBe(true);
    });

    it('minimize -> side 전환 시 srcObject가 정상 설정된다', async () => {
      const nonLiveTrackStream: MediaStream = {
        id: 'stream-not-live',
        getTracks: () => [],
        getVideoTracks: () => [{ readyState: 'ended' as MediaStreamTrackState }],
      } as unknown as MediaStream;

      const { rerender } = render(
        <MyParticipantVideo
          {...defaultProps}
          stream={nonLiveTrackStream}
          isCameraOn={true}
          mode="minimize"
        />,
      );

      expect(document.querySelector('video')).not.toBeInTheDocument();

      rerender(
        <MyParticipantVideo
          {...defaultProps}
          stream={nonLiveTrackStream}
          isCameraOn={true}
          mode="side"
        />,
      );

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      await waitFor(() => {
        expect(videoElement.srcObject).toBe(nonLiveTrackStream);
      });
    });

    it('스트림 없음 + 카메라 OFF 시 cam-disabled 아이콘 표시', () => {
      render(<MyParticipantVideo {...defaultProps} />);
      expect(screen.getByTestId('icon-cam-disabled')).toBeInTheDocument();
    });

    it('카메라 OFF 시 srcObject 정리', async () => {
      const { rerender } = render(
        <MyParticipantVideo
          {...defaultProps}
          stream={mockStream}
          isCameraOn={true}
        />,
      );

      const videoElement = document.querySelector('video') as HTMLVideoElement;
      await waitFor(() => {
        expect(videoElement.srcObject).toBe(mockStream);
      });

      rerender(
        <MyParticipantVideo
          {...defaultProps}
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
          <MyParticipantVideo
            {...defaultProps}
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
          <MyParticipantVideo
            {...defaultProps}
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
        <MyParticipantVideo
          {...defaultProps}
          mode="minimize"
        />,
      );

      expect(document.querySelector('video')).not.toBeInTheDocument();
    });
  });

  describe('제스처 프로그레스 오버레이', () => {
    it('gesture 없을 때 오버레이 없음', () => {
      render(<MyParticipantVideo {...defaultProps} />);

      expect(screen.queryByTestId('icon-thumbs-up')).not.toBeInTheDocument();
    });
  });

  describe('모드별 UI 및 버튼 동작', () => {
    it('minimize 모드에서 확대 버튼 + 클릭 동작', () => {
      const onModeChange = vi.fn();
      render(
        <MyParticipantVideo
          {...defaultProps}
          mode="minimize"
          onModeChange={onModeChange}
        />,
      );

      expect(screen.getByLabelText('확대')).toBeInTheDocument();
      expect(screen.getByTestId('icon-maximize')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('확대'));
      expect(onModeChange).toHaveBeenCalledWith('pip');
    });
  });

  describe('표시 텍스트', () => {
    it('이름이 표시된다', () => {
      render(<MyParticipantVideo {...defaultProps} />);
      expect(screen.getByText('호눅스')).toBeInTheDocument();
    });
  });
});
