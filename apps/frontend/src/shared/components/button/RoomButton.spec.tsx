import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import RoomButton from './RoomButton';

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <svg
      data-testid="icon"
      className={className}
    >
      {name}
    </svg>
  ),
}));

describe('RoomButton', () => {
  it('아이콘이 렌더링된다', () => {
    render(<RoomButton icon="chat" />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toHaveTextContent('chat');
  });

  it('isActive=true일 때 기본 variant는 bg-primary 클래스를 가진다', () => {
    render(
      <RoomButton
        icon="chat"
        isActive
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('variant="ghost"일 때 bg-transparent 클래스를 가진다', () => {
    render(
      <RoomButton
        icon="home"
        variant="ghost"
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('variant="ghost"이고 isActive=true이면 아이콘에 text-primary 클래스가 적용된다', () => {
    render(
      <RoomButton
        icon="chat"
        variant="ghost"
        isActive
      />,
    );

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveClass('text-primary');
  });

  it('hasAlarm=true일 때 알람 뱃지가 렌더링된다', () => {
    render(
      <RoomButton
        icon="chat"
        hasAlarm
      />,
    );

    const alarm = document.querySelector('.bg-error');
    expect(alarm).toBeInTheDocument();
  });
});
