import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ParticipantVideo } from './ParticipantVideo';
import { useMediaStore, RemoteStream } from '../stores/useMediaStore';
import type { ParticipantRole } from '@plum/shared-interfaces';
import { useMediaControlContext } from '../hooks/useMediaControlContext';

// 1. 외부 의존성 모킹
vi.mock('../stores/useMediaStore', () => ({
  useMediaStore: vi.fn(),
}));

vi.mock('../hooks/useMediaControlContext', () => ({
  useMediaControlContext: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { ui: { debug: vi.fn() } },
}));

const mockUseMediaStore = vi.mocked(useMediaStore);
const mockUseMediaControlContext = vi.mocked(useMediaControlContext);

describe('ParticipantVideo', () => {
  const mockConsume = vi.fn();
  const mockStopConsuming = vi.fn();
  const mockStream = { id: 'stream-123', getTracks: () => [] } as unknown as MediaStream;

  const defaultProps = {
    id: 'participant-1',
    name: '호눅스',
    mode: 'side' as const,
    videoProducerId: 'prod-123',
    participantRole: 'audience' as ParticipantRole,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // 기본적으로 수신 컨텍스트 모킹
    mockUseMediaControlContext.mockReturnValue({
      consumeRemoteProducer: mockConsume,
      stopConsuming: mockStopConsuming,
    } as unknown as ReturnType<typeof useMediaControlContext>);

    // 기본적으로 스토어에서 스트림이 없는 상태로 시작
    mockUseMediaStore.mockImplementation((selector) =>
      selector({ remoteStreams: new Map<string, RemoteStream>() } as Parameters<
        typeof selector
      >[0]),
    );
  });

  describe('수신(Consume) 제어 로직', () => {
    it('isActive가 true이면 마운트 시 consumeRemoteProducer가 호출된다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          isActive={true}
        />,
      );

      expect(mockConsume).toHaveBeenCalledWith(
        expect.objectContaining({
          participantId: defaultProps.id,
          producerId: defaultProps.videoProducerId,
        }),
      );
    });

    it('isActive가 false이면 stopConsuming이 호출되어야 한다 (윈도우 밖으로 밀려남)', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          isActive={false}
        />,
      );

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });

    it('컴포넌트가 언마운트될 때 반드시 stopConsuming이 호출되어 리소스를 정리한다', () => {
      const { unmount } = render(
        <ParticipantVideo
          {...defaultProps}
          isActive={true}
        />,
      );

      unmount();

      expect(mockStopConsuming).toHaveBeenCalledWith(defaultProps.id, 'video');
    });
  });

  describe('비디오 렌더링 및 스트림 연결', () => {
    it('스토어에 스트림이 들어오면 <video> 태그가 렌더링된다', () => {
      mockUseMediaStore.mockImplementation((selector) => {
        const state = {
          remoteStreams: new Map<string, RemoteStream>([
            [
              'conn-1',
              {
                participantId: 'participant-1',
                type: 'video',
                stream: mockStream,
                consumerId: 'conn-1',
              },
            ],
          ]),
        };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<ParticipantVideo {...defaultProps} />);

      const videoElement = document.querySelector('video');
      expect(videoElement).toBeInTheDocument();
    });

    it('카메라가 꺼져 있거나 스트림이 없으면 cam-disabled 아이콘을 보여준다', () => {
      render(<ParticipantVideo {...defaultProps} />);

      expect(screen.getByRole('img', { name: 'cam-disabled' })).toBeInTheDocument();
      expect(document.querySelector('video')).not.toBeInTheDocument();
    });
  });

  describe('페이지네이션 가시성 (isCurrentlyVisible)', () => {
    it('isCurrentlyVisible이 false이면 display: none 스타일이 적용된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentlyVisible={false}
        />,
      );

      const motionDiv = container.firstChild as HTMLElement;
      expect(motionDiv).toHaveStyle({ display: 'none' });
    });

    it('isCurrentlyVisible이 true이면 display: block 스타일이 적용된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentlyVisible={true}
        />,
      );

      const motionDiv = container.firstChild as HTMLElement;
      expect(motionDiv).toHaveStyle({ display: 'block' });
    });
  });

  describe('사용자 모드 전환 제어', () => {
    it('현재 사용자인 경우 layoutId가 부여되어 애니메이션이 연결된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          isCurrentUser={true}
        />,
      );

      expect(container.firstChild).toHaveClass('group');
    });
  });
});
