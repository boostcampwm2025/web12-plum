import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ParticipantGrid } from './ParticipantGrid';
import { useItemsPerPage } from '../hooks/useItemsPerPage';
import { useParticipantPagination } from '../hooks/useParticipantPagination';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useStreamStore } from '../../../store/useLocalStreamStore';
import type { Participant } from '../stores/useRoomStore';

vi.mock('../hooks/useItemsPerPage');
vi.mock('../hooks/useParticipantPagination');
vi.mock('../stores/useMediaStore');
vi.mock('../stores/useRoomStore');
vi.mock('@/store/useLocalStreamStore');

vi.mock('./ParticipantVideo', () => ({
  ParticipantVideo: ({
    id,
    name,
    mode,
    isCurrentUser,
    onModeChange,
    isCurrentlyVisible,
  }: {
    id: string;
    name: string;
    mode: string;
    isCurrentUser?: boolean;
    onModeChange?: (mode: string) => void;
    isCurrentlyVisible?: boolean;
  }) => (
    <div
      data-testid={`participant-video-${id}`}
      data-mode={mode}
      data-is-current-user={isCurrentUser}
      data-visible={isCurrentlyVisible}
      onClick={() => isCurrentUser && onModeChange?.('pip')}
    >
      {name}
    </div>
  ),
}));

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name }: { name: string }) => <svg data-testid="icon">{name}</svg>,
}));

vi.mock('@/shared/components/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

describe('ParticipantGrid', () => {
  const mockGoToPrevPage = vi.fn();
  const mockGoToNextPage = vi.fn();

  const createParticipant = (id: string, name: string): Participant => ({
    id,
    name,
    producers: new Map(),
    role: 'audience',
    joinedAt: new Date(),
  });

  const currentUser: Participant = createParticipant('user-1', '나');

  const participants: Participant[] = [
    createParticipant('p-1', '참가자 1'),
    createParticipant('p-2', '참가자 2'),
    createParticipant('p-3', '참가자 3'),
    createParticipant('p-4', '참가자 4'),
  ];

  const setupMockPagination = (overrides = {}) => {
    vi.mocked(useParticipantPagination).mockReturnValue({
      currentPage: 0,
      itemsPerPage: 2,
      totalPages: 2,
      goToPrevPage: mockGoToPrevPage,
      goToNextPage: mockGoToNextPage,
      hasPrevPage: false,
      hasNextPage: true,
      sortedParticipants: participants,
      visibleWindowParticipants: participants,
      currentItems: [],
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useItemsPerPage).mockReturnValue(2);

    vi.mocked(useMediaStore).mockImplementation((selector) =>
      selector({ isCameraOn: false, remoteStreams: new Map() } as Parameters<typeof selector>[0]),
    );
    vi.mocked(useRoomStore).mockImplementation((selector) =>
      selector({
        actions: { getParticipantList: () => participants },
      } as Parameters<typeof selector>[0]),
    );
    vi.mocked(useStreamStore).mockImplementation((selector) =>
      selector({ localStream: null } as Parameters<typeof selector>[0]),
    );

    setupMockPagination();
  });

  it('현재 사용자 비디오와 페이지네이션 버튼이 정상 렌더링된다', () => {
    render(
      <ParticipantGrid
        videoMode="side"
        currentUser={currentUser}
      />,
    );

    expect(screen.getByTestId('participant-video-user-1')).toBeInTheDocument();
    expect(screen.getByLabelText('이전 참가자 보기')).toBeInTheDocument();
    expect(screen.getByLabelText('다음 참가자 보기')).toBeInTheDocument();
  });

  it('슬라이딩 윈도우(Prefetch) 내의 모든 참가자가 렌더링되지만 가시성 속성이 올바르게 부여된다', () => {
    setupMockPagination({
      currentPage: 0,
      itemsPerPage: 2,
      visibleWindowParticipants: participants.slice(0, 4),
    });

    render(
      <ParticipantGrid
        videoMode="side"
        currentUser={currentUser}
      />,
    );

    const p1 = screen.getByTestId('participant-video-p-1');
    const p2 = screen.getByTestId('participant-video-p-2');
    const p3 = screen.getByTestId('participant-video-p-3');

    expect(p1).toHaveAttribute('data-visible', 'true');
    expect(p2).toHaveAttribute('data-visible', 'true');
    expect(p3).toHaveAttribute('data-visible', 'false');
  });

  it('페이지네이션 버튼 활성화/비활성화 상태가 반영된다', () => {
    setupMockPagination({ hasPrevPage: true, hasNextPage: false });

    render(
      <ParticipantGrid
        videoMode="side"
        currentUser={currentUser}
      />,
    );

    expect(screen.getByLabelText('이전 참가자 보기')).not.toBeDisabled();
    expect(screen.getByLabelText('다음 참가자 보기')).toBeDisabled();
  });

  it('다음 버튼 클릭 시 goToNextPage 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    render(
      <ParticipantGrid
        videoMode="side"
        currentUser={currentUser}
      />,
    );

    await user.click(screen.getByLabelText('다음 참가자 보기'));
    expect(mockGoToNextPage).toHaveBeenCalled();
  });

  it('현재 사용자의 비디오 모드 변경 요청을 처리한다', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(
      <ParticipantGrid
        videoMode="side"
        currentUser={currentUser}
        onModeChange={onModeChange}
      />,
    );

    const currentUserVideo = screen.getByTestId('participant-video-user-1');
    await user.click(currentUserVideo);

    expect(onModeChange).toHaveBeenCalledWith('pip');
  });

  it('videoMode가 side가 아니면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(
      <ParticipantGrid
        videoMode="minimize"
        currentUser={currentUser}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
