import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { RoomMenuBar } from './RoomMenuBar';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';

vi.mock('../stores/useMediaStore');
vi.mock('../stores/useRoomUIStore');

describe('RoomMenuBar', () => {
  const mockToggleMic = vi.fn();
  const mockToggleCamera = vi.fn();
  const mockToggleScreenShare = vi.fn();
  const mockSetActiveDialog = vi.fn();
  const mockSetActiveSidePanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMediaStore).mockReturnValue({
      isMicOn: false,
      isCameraOn: false,
      isScreenSharing: false,
      toggleMic: mockToggleMic,
      toggleCamera: mockToggleCamera,
      toggleScreenShare: mockToggleScreenShare,
      initialize: vi.fn(),
    });

    vi.mocked(useRoomUIStore).mockReturnValue({
      activeDialog: null,
      activeSidePanel: null,
      setActiveDialog: mockSetActiveDialog,
      setActiveSidePanel: mockSetActiveSidePanel,
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
    expect(mockToggleScreenShare).toHaveBeenCalledTimes(1);
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

  it('나가기 버튼 클릭 시 onExit이 호출된다', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();

    render(<RoomMenuBar onExit={onExit} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[6]); // 나가기
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
