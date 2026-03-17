import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PollManagementTabs } from './PollManagementTabs';
import { usePollStore } from '../stores/usePollStore';

const createPoll = (overrides: Partial<import('@plum/shared-interfaces').Poll> = {}) => ({
  id: 'poll-1',
  roomId: 'room-1',
  status: 'pending' as const,
  title: '기본 투표',
  options: [
    { id: 1, value: '옵션1', count: 0, voters: [] },
    { id: 2, value: '옵션2', count: 0, voters: [] },
  ],
  timeLimit: 120,
  createdAt: '2024-08-01T09:00:00.000Z',
  updatedAt: '2024-08-01T09:00:00.000Z',
  startedAt: '',
  endedAt: '',
  ...overrides,
});

vi.mock('@/shared/components/PollModal', () => ({
  PollModal: ({ isOpen }: { isOpen: boolean }) => (
    <div
      data-testid="poll-modal"
      data-open={isOpen ? 'true' : 'false'}
    />
  ),
}));

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span>{name}</span>,
}));

describe('PollManagementTabs', () => {
  beforeEach(() => {
    usePollStore.setState((state) => ({
      ...state,
      polls: [
        createPoll({ id: 'poll-1', title: '오늘 저녁 메뉴로 가장 적절한 것은?' }),
        createPoll({ id: 'poll-2', title: '다음 팀 회의 날짜는 언제가 좋을까요?' }),
        createPoll({
          id: 'poll-3',
          title: '오늘 저녁 메뉴로 가장 적절한 것은?',
          status: 'active',
          options: [
            { id: 1, value: '삼겹살에 된장찌개', count: 12, voters: [] },
            { id: 2, value: '연어 포케', count: 7, voters: [] },
          ],
          timeLimit: 300,
          startedAt: '2024-08-01T11:00:00.000Z',
        }),
        createPoll({
          id: 'poll-4',
          title: '지난 회의 만족도는 어땠나요?',
          status: 'ended',
          options: [
            { id: 1, value: '만족', count: 18, voters: [] },
            { id: 2, value: '보통', count: 5, voters: [] },
          ],
          timeLimit: 120,
          startedAt: '2024-08-01T08:30:00.000Z',
          endedAt: '2024-08-01T08:30:00.000Z',
        }),
      ],
    }));
  });

  it('예정된 투표 리스트가 기본으로 렌더링된다', () => {
    render(<PollManagementTabs />);

    expect(screen.getByText('오늘 저녁 메뉴로 가장 적절한 것은?')).toBeInTheDocument();
    expect(screen.getByText('다음 팀 회의 날짜는 언제가 좋을까요?')).toBeInTheDocument();
  });

  it('새로운 투표 추가 버튼을 누르면 모달이 열린다', async () => {
    const user = userEvent.setup();
    render(<PollManagementTabs />);

    expect(screen.getByTestId('poll-modal')).toHaveAttribute('data-open', 'false');

    await user.click(screen.getByRole('button', { name: /새로운 투표 추가/ }));

    expect(screen.getByTestId('poll-modal')).toHaveAttribute('data-open', 'true');
  });

  it('진행중 탭으로 이동하면 활성 투표 내용이 보인다', async () => {
    const user = userEvent.setup();
    render(<PollManagementTabs />);

    await user.click(screen.getByRole('tab', { name: /진행중/ }));

    await screen.findByText('오늘 저녁 메뉴로 가장 적절한 것은?');
    await screen.findByText('삼겹살에 된장찌개');
    await screen.findByText('연어 포케');
  });

  it('완료 탭으로 이동하면 완료된 투표가 보인다', async () => {
    const user = userEvent.setup();
    render(<PollManagementTabs />);

    await user.click(screen.getByRole('tab', { name: /완료/ }));

    await screen.findByText('지난 회의 만족도는 어땠나요?');
    await screen.findByText('만족');
    await screen.findByText('보통');
  });
});
