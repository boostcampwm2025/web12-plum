import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PollManagementTabs } from './PollManagementTabs';

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
