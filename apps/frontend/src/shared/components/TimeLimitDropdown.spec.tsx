import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TimeLimitDropdown } from './TimeLimitDropdown';

describe('TimeLimitDropdown', () => {
  it('기본 상태에서 "제한 없음"이 표시된다', () => {
    const handleChange = vi.fn();
    render(<TimeLimitDropdown onChange={handleChange} />);

    expect(screen.getByText('제한 없음')).toBeInTheDocument();
  });

  it('selectedTime prop에 따라 선택된 옵션이 표시된다', () => {
    const handleChange = vi.fn();
    render(
      <TimeLimitDropdown
        onChange={handleChange}
        selectedTime={60}
      />,
    );

    expect(screen.getByText('1분')).toBeInTheDocument();
  });

  it('드롭다운 버튼을 클릭하면 옵션 리스트가 열린다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TimeLimitDropdown onChange={handleChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('30초')).toBeInTheDocument();
    expect(screen.getByText('3분')).toBeInTheDocument();
    expect(screen.getByText('5분')).toBeInTheDocument();
    expect(screen.getByText('10분')).toBeInTheDocument();
  });

  it('옵션을 클릭하면 onChange가 호출되고 드롭다운이 닫힌다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TimeLimitDropdown onChange={handleChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    const option = screen.getByText('1분');
    await user.click(option);

    expect(handleChange).toHaveBeenCalledWith(60);
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('열린 드롭다운을 다시 클릭하면 닫힌다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TimeLimitDropdown onChange={handleChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(button);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('선택된 옵션에 aria-selected가 적용된다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TimeLimitDropdown
        onChange={handleChange}
        selectedTime={60}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    const selectedOption = screen.getByRole('option', { name: '1분' });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');
  });

  it('모든 시간 제한 옵션이 정확하게 표시된다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TimeLimitDropdown onChange={handleChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    expect(screen.getByRole('option', { name: '제한 없음' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '30초' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1분' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3분' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '5분' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '10분' })).toBeInTheDocument();
  });

  it('각 옵션 클릭 시 올바른 값이 전달된다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TimeLimitDropdown onChange={handleChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    await user.click(screen.getByText('30초'));
    expect(handleChange).toHaveBeenCalledWith(30);

    await user.click(button);
    await user.click(screen.getByText('3분'));
    expect(handleChange).toHaveBeenCalledWith(180);

    await user.click(button);
    await user.click(screen.getByText('10분'));
    expect(handleChange).toHaveBeenCalledWith(600);
  });
});
