import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Select, type SelectOption } from './Select';

const mockOptions: SelectOption<string>[] = [
  { label: '옵션 1', value: 'option1' },
  { label: '옵션 2', value: 'option2' },
  { label: '옵션 3', value: 'option3' },
];

describe('Select', () => {
  describe('드롭다운 열기/닫기', () => {
    it('버튼 클릭 시 드롭다운이 열린다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '옵션 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '옵션 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '옵션 3' })).toBeInTheDocument();
    });

    it('열린 드롭다운을 다시 클릭하면 닫힌다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('ESC 키로 드롭다운이 닫힌다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('옵션 선택', () => {
    it('옵션 클릭 시 onChange가 호출되고 드롭다운이 닫힌다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const option = screen.getByText('옵션 2');
      await user.click(option);

      expect(handleChange).toHaveBeenCalledWith('option2');
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('선택된 옵션에 aria-selected가 적용된다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option2"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const selectedOption = screen.getByRole('option', { name: '옵션 2' });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('키보드 네비게이션', () => {
    it('ArrowDown 키로 다음 옵션으로 이동한다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('option2');
    });

    it('ArrowUp 키로 이전 옵션으로 이동한다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option3"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('option2');
    });

    it('Enter 키로 옵션을 선택한다', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          value="option1"
          onChange={handleChange}
          options={mockOptions}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('option1');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
