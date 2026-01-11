import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ParticipantGrid } from './ParticipantGrid';
import { useItemsPerPage } from '../hooks/useItemsPerPage';
import { usePagination } from '../hooks/usePagination';
import type { Participant } from '../types';

vi.mock('../hooks/useItemsPerPage');
vi.mock('../hooks/usePagination');

vi.mock('./ParticipantVideo', () => ({
  ParticipantVideo: ({
    id,
    name,
    mode,
    isCurrentUser,
    onModeChange,
  }: {
    id: string;
    name: string;
    mode: string;
    isCurrentUser?: boolean;
    onModeChange?: (mode: string) => void;
  }) => (
    <div
      data-testid={`participant-video-${id}`}
      data-mode={mode}
      data-is-current-user={isCurrentUser}
      onClick={() => onModeChange?.('pip')}
    >
      {name}
    </div>
  ),
}));

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size, className }: { name: string; size?: number; className?: string }) => (
    <svg
      data-testid="icon"
      data-name={name}
      data-size={size}
      className={className}
    />
  ),
}));

vi.mock('@/shared/components/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

describe('ParticipantGrid', () => {
  const mockGoToPrevPage = vi.fn();
  const mockGoToNextPage = vi.fn();

  const currentUser: Participant = {
    id: 'user-1',
    name: '나',
  };

  const participants: Participant[] = [
    { id: 'participant-1', name: '참가자 1' },
    { id: 'participant-2', name: '참가자 2' },
    { id: 'participant-3', name: '참가자 3' },
  ];

  const mockPagination = (overrides?: {
    currentItems?: Participant[];
    hasPrevPage?: boolean;
    hasNextPage?: boolean;
    currentPage?: number;
    totalPages?: number;
  }) => {
    vi.mocked(usePagination).mockReturnValue({
      currentItems: participants,
      goToPrevPage: mockGoToPrevPage,
      goToNextPage: mockGoToNextPage,
      hasPrevPage: false,
      hasNextPage: false,
      currentPage: 1,
      totalPages: 1,
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useItemsPerPage).mockReturnValue(3);
    mockPagination();
  });

  it('현재 사용자 비디오가 렌더링된다', () => {
    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    const currentUserVideo = screen.getByTestId('participant-video-user-1');
    expect(currentUserVideo).toBeInTheDocument();
    expect(currentUserVideo).toHaveTextContent('나');
    expect(currentUserVideo).toHaveAttribute('data-is-current-user', 'true');
    expect(currentUserVideo).toHaveAttribute('data-mode', 'side');
  });

  it('모든 참가자 비디오가 렌더링된다', () => {
    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    expect(screen.getByTestId('participant-video-participant-1')).toBeInTheDocument();
    expect(screen.getByTestId('participant-video-participant-2')).toBeInTheDocument();
    expect(screen.getByTestId('participant-video-participant-3')).toBeInTheDocument();
  });

  it('이전/다음 페이지 버튼이 렌더링된다', () => {
    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    expect(screen.getByLabelText('이전 참가자 보기')).toBeInTheDocument();
    expect(screen.getByLabelText('다음 참가자 보기')).toBeInTheDocument();
  });

  it('페이지가 없을 때 해당 버튼이 비활성화된다', () => {
    mockPagination({ hasNextPage: true, totalPages: 2 });

    const { rerender } = render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    expect(screen.getByLabelText('이전 참가자 보기')).toBeDisabled();
    expect(screen.getByLabelText('다음 참가자 보기')).not.toBeDisabled();

    mockPagination({ hasPrevPage: true, currentPage: 2, totalPages: 2 });

    rerender(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    expect(screen.getByLabelText('이전 참가자 보기')).not.toBeDisabled();
    expect(screen.getByLabelText('다음 참가자 보기')).toBeDisabled();
  });

  it('페이지네이션 버튼 클릭 시 해당 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    mockPagination({ hasPrevPage: true, hasNextPage: true, currentPage: 2, totalPages: 3 });

    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    await user.click(screen.getByLabelText('이전 참가자 보기'));
    expect(mockGoToPrevPage).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('다음 참가자 보기'));
    expect(mockGoToNextPage).toHaveBeenCalledTimes(1);
  });

  it('현재 사용자 비디오에 onModeChange가 전달된다', () => {
    const onModeChange = vi.fn();

    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
        onModeChange={onModeChange}
      />,
    );

    const currentUserVideo = screen.getByTestId('participant-video-user-1');
    currentUserVideo.click();

    expect(onModeChange).toHaveBeenCalledWith('pip');
  });

  it('페이지네이션이 올바른 참가자 목록을 표시한다', () => {
    const paginatedParticipants = [
      { id: 'participant-1', name: '참가자 1' },
      { id: 'participant-2', name: '참가자 2' },
    ];

    mockPagination({ currentItems: paginatedParticipants, hasNextPage: true, totalPages: 2 });

    render(
      <ParticipantGrid
        currentUser={currentUser}
        participants={participants}
      />,
    );

    expect(screen.getByTestId('participant-video-participant-1')).toBeInTheDocument();
    expect(screen.getByTestId('participant-video-participant-2')).toBeInTheDocument();
    expect(screen.queryByTestId('participant-video-participant-3')).not.toBeInTheDocument();
  });
});
