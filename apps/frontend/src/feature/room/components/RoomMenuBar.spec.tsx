import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { RoomMenuBar } from './RoomMenuBar';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useMediaConnectionContext } from '../hooks/useMediaConnectionContext';

vi.mock('../stores/useMediaStore');
vi.mock('../stores/useRoomUIStore');
vi.mock('../hooks/useMediaConnectionContext');

describe('RoomMenuBar', () => {
  const mockToggleMic = vi.fn();
  const mockToggleCamera = vi.fn();
  const mockStartScreenShare = vi.fn();
  const mockStopScreenShare = vi.fn();
  const mockSetActiveDialog = vi.fn();
  const mockSetActiveSidePanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const mockMediaStoreState = {
      isMicOn: false,
      isCameraOn: false,
      isScreenSharing: false,
      screenStream: null,
      remoteStreams: new Map(),
      hasHydrated: true,
      actions: {
        toggleMic: mockToggleMic,
        toggleCamera: mockToggleCamera,
        toggleScreenShare: vi.fn(),
        initialize: vi.fn(),
        setHasHydrated: vi.fn(),
        setScreenSharing: vi.fn(),
        setScreenStream: vi.fn(),
        addRemoteStream: vi.fn(),
        removeRemoteStream: vi.fn(),
        getRemoteStreamsByParticipant: vi.fn(),
        getRemoteStream: vi.fn(),
        resetRemoteStreams: vi.fn(),
      },
    };

    vi.mocked(useMediaStore).mockImplementation(
      (selector?: (state: typeof mockMediaStoreState) => unknown) => {
        if (selector) {
          return selector(mockMediaStoreState);
        }
        return mockMediaStoreState;
      },
    );
    vi.mocked(useMediaStore).getState = vi.fn().mockReturnValue(mockMediaStoreState);

    vi.mocked(useRoomUIStore).mockReturnValue({
      activeDialog: null,
      activeSidePanel: null,
      setActiveDialog: mockSetActiveDialog,
      setActiveSidePanel: mockSetActiveSidePanel,
    });

    vi.mocked(useMediaConnectionContext).mockReturnValue({
      startProducing: vi.fn(),
      stopProducing: vi.fn(),
      consumeRemoteProducer: vi.fn(),
      cleanup: vi.fn(),
      toggleMicProducer: vi.fn(),
      toggleCameraProducer: vi.fn(),
      startScreenShare: mockStartScreenShare,
      stopScreenShare: mockStopScreenShare,
    });
  });

  it('강의실 제목이 렌더링된다', () => {
    render(<RoomMenuBar roomTitle="네부캠 마스터 클래스" />);

    expect(screen.getByText('네부캠 마스터 클래스')).toBeInTheDocument();
  });

  it('모든 버튼이 렌더링된다 (메인 6 + 나가기 1 + 사이드 3)', () => {
    render(<RoomMenuBar />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(10);
  });

  it('미디어(mic, cam, screen-share) 버튼 클릭 시 각 핸들러가 호출된다', async () => {
    const user = userEvent.setup();

    render(<RoomMenuBar />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]); // 마이크
    await user.click(buttons[1]); // 카메라
    await user.click(buttons[2]); // 화면 공유

    expect(mockToggleMic).toHaveBeenCalledTimes(1);
    expect(mockToggleCamera).toHaveBeenCalledTimes(1);
    expect(mockStartScreenShare).toHaveBeenCalledTimes(1);
  });

  it('다이어로그 버튼(vote) 클릭 시 setActiveDialog가 호출된다', async () => {
    const user = userEvent.setup();

    render(<RoomMenuBar />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[3]); // 투표

    expect(mockSetActiveDialog).toHaveBeenCalledWith('vote');
  });

  it('사이드패널 버튼(chat) 클릭 시 setActiveSidePanel이 호출된다', async () => {
    const user = userEvent.setup();

    render(<RoomMenuBar />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[7]); // 채팅

    expect(mockSetActiveSidePanel).toHaveBeenCalledWith('chat');
  });
});
