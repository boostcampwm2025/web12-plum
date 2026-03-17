import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PollState } from '../stores/usePollStore';
import { usePollStore } from '../stores/usePollStore';
import { PollDialog } from './PollDialog';

import '@testing-library/jest-dom';

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => (
    <svg
      data-testid="icon"
      data-size={size}
    >
      {name}
    </svg>
  ),
}));

vi.mock('../stores/usePollStore');
vi.mock('@/shared/stores/useToastStore', () => ({
  useToastStore: vi.fn((selector: (state: { actions: { addToast: () => void } }) => unknown) =>
    selector({ actions: { addToast: vi.fn() } }),
  ),
}));
vi.mock('../services/poll', () => ({
  PollService: { vote: vi.fn().mockResolvedValue(undefined) },
}));

const mockSetAudienceVotedOption = vi.fn();

const mockPoll = {
  id: 'poll-1',
  roomId: '',
  status: 'active' as const,
  title: '오늘 강의 어땠나요?',
  options: [
    { id: 1, value: '좋았어요', count: 1, voters: [] },
    { id: 2, value: '보통이에요', count: 3, voters: [] },
  ],
  timeLimit: 300,
  createdAt: '',
  updatedAt: '',
  startedAt: new Date().toISOString(),
  endedAt: null,
};

const setupPollMock = (polls: PollState['polls'], votedOptionId: number | null = null) => {
  vi.mocked(usePollStore).mockImplementation(<T,>(selector: (state: PollState) => T): T => {
    const state: PollState = {
      polls,
      audienceVotedOptionByPollId: votedOptionId !== null ? { 'poll-1': votedOptionId } : {},
      actions: {
        hydrateFromPolls: vi.fn(),
        setActivePoll: vi.fn(),
        clearActivePoll: vi.fn(),
        updatePollOptions: vi.fn(),
        updatePollDetail: vi.fn(),
        setCompletedFromEndDetail: vi.fn(),
        setAudienceVotedOption: mockSetAudienceVotedOption,
        clear: vi.fn(),
      },
    };
    return selector(state);
  });
};

describe('PollDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('투표가 없으면 안내 문구가 렌더링된다', () => {
    setupPollMock([]);
    render(<PollDialog />);

    expect(screen.getByText('현재 진행중인 투표가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('투표 제목과 선택지, 퍼센트가 렌더링된다', () => {
    setupPollMock([mockPoll]);
    const { container } = render(<PollDialog />);

    expect(screen.getByText('오늘 강의 어땠나요?')).toBeInTheDocument();
    expect(screen.getByText('좋았어요')).toBeInTheDocument();
    expect(screen.getByText('보통이에요')).toBeInTheDocument();
    expect(screen.getByText('1 (25%)')).toBeInTheDocument();
    expect(screen.getByText('3 (75%)')).toBeInTheDocument();

    const overlays = container.querySelectorAll('button div[style]');
    expect(overlays[0]).toHaveStyle({ width: '25%' });
    expect(overlays[1]).toHaveStyle({ width: '75%' });
  });

  it('한 번 선택하면 모든 선택지가 비활성화된다', async () => {
    const user = userEvent.setup();

    setupPollMock([mockPoll], null);
    const { rerender } = render(<PollDialog />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);

    // 투표 후 상태로 리렌더링
    setupPollMock([mockPoll], 1);
    rerender(<PollDialog />);

    const updatedButtons = screen.getAllByRole('button');
    expect(updatedButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(updatedButtons[1]).toHaveAttribute('aria-pressed', 'false');
    updatedButtons.forEach((button) => expect(button).toBeDisabled());
  });
});
