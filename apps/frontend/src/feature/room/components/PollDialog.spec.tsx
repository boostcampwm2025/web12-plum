import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PollDialog } from './PollDialog';

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

const mockPoll = {
  id: 'poll-1',
  title: '오늘 강의 어땠나요?',
  options: [
    { id: 1, value: '좋았어요', count: 1 },
    { id: 2, value: '보통이에요', count: 3 },
  ],
  timeLimit: 300,
};

describe('PollDialog', () => {
  it('투표가 없으면 안내 문구가 렌더링된다', () => {
    render(<PollDialog startedAt={Date.now()} />);

    expect(screen.getByText('현재 진행중인 투표가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('투표 제목과 선택지, 퍼센트가 렌더링된다', () => {
    const { container } = render(
      <PollDialog
        poll={mockPoll}
        startedAt={Date.now()}
      />,
    );

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
    render(
      <PollDialog
        poll={mockPoll}
        startedAt={Date.now()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);

    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    buttons.forEach((button) => expect(button).toBeDisabled());
  });
});
