import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Button from './Button';

describe('Button', () => {
  it('children이 렌더링된다', () => {
    render(<Button>클릭</Button>);
    expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument();
  });

  it('클릭 이벤트가 발생한다', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>클릭</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled일 때 클릭 이벤트가 발생하지 않는다', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button
        onClick={handleClick}
        disabled
      >
        비활성화
      </Button>,
    );
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('variant prop이 올바르게 적용된다', () => {
    render(<Button variant="ghost">고스트</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-primary');
  });

  it('type prop이 올바르게 적용된다', () => {
    render(<Button type="submit">제출</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('기본 type은 button이다', () => {
    render(<Button>버튼</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });
});
