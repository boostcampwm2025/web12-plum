import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Dialog } from './Dialog';

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

vi.mock('@/shared/components/Button', () => ({
  Button: ({
    children,
    onClick,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

describe('Dialog', () => {
  const defaultProps = {
    title: '테스트 다이얼로그',
    children: <div>다이얼로그 내용</div>,
  };

  it('제목이 렌더링된다', () => {
    render(<Dialog {...defaultProps} />);

    expect(screen.getByText('테스트 다이얼로그')).toBeInTheDocument();
  });

  it('children이 렌더링된다', () => {
    render(<Dialog {...defaultProps} />);

    expect(screen.getByText('다이얼로그 내용')).toBeInTheDocument();
  });

  it('닫기 버튼이 렌더링된다', () => {
    render(<Dialog {...defaultProps} />);

    const closeButton = screen.getByLabelText('닫기');
    expect(closeButton).toBeInTheDocument();

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveTextContent('x');
    expect(icon).toHaveAttribute('data-size', '24');
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog
        {...defaultProps}
        onClose={onClose}
      />,
    );

    const closeButton = screen.getByLabelText('닫기');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
