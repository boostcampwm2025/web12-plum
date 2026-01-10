import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Input } from './Input';

describe('Input', () => {
  it('placeholder가 렌더링된다', () => {
    render(<Input placeholder="이름을 입력하세요" />);
    expect(screen.getByPlaceholderText('이름을 입력하세요')).toBeInTheDocument();
  });

  it('value가 렌더링된다', () => {
    render(
      <Input
        value="홍길동"
        readOnly
      />,
    );
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
  });

  it('onChange 이벤트가 발생한다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, '테스트');

    expect(handleChange).toHaveBeenCalled();
  });

  it('type prop이 적용된다', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('size variant가 적용된다', () => {
    const { container } = render(<Input size="lg" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('px-4', 'py-3', 'text-base');
  });

  it('disabled일 때 입력할 수 없다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Input
        disabled
        onChange={handleChange}
      />,
    );
    const input = screen.getByRole('textbox');

    await user.type(input, '테스트');

    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toBeDisabled();
  });

  it('커스텀 className이 적용된다', () => {
    const { container } = render(<Input className="custom-class" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('custom-class');
  });
});
