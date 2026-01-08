import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PollOptionListSection } from './PollOptionListSection';
import type { PollOption } from '../types';

describe('PollOptionListSection', () => {
  const mockOptions: PollOption[] = [
    { id: 'option-1', value: '첫 번째 선택지' },
    { id: 'option-2', value: '두 번째 선택지' },
  ];

  const defaultProps = {
    options: mockOptions,
    onAddOption: vi.fn(),
    onDeleteOption: vi.fn(),
    onUpdateOption: vi.fn(),
    canAddMore: true,
    canDelete: true,
  };

  it('제목을 렌더링해야 한다', () => {
    render(<PollOptionListSection {...defaultProps} />);
    expect(screen.getByText('투표 선택지')).toBeInTheDocument();
  });

  it('모든 선택지를 렌더링해야 한다', () => {
    render(<PollOptionListSection {...defaultProps} />);

    expect(screen.getByPlaceholderText('선택지 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('선택지 2')).toBeInTheDocument();
  });

  it('각 선택지의 값을 표시해야 한다', () => {
    render(<PollOptionListSection {...defaultProps} />);

    expect(screen.getByDisplayValue('첫 번째 선택지')).toBeInTheDocument();
    expect(screen.getByDisplayValue('두 번째 선택지')).toBeInTheDocument();
  });

  it('선택지 추가 버튼을 렌더링해야 한다', () => {
    render(<PollOptionListSection {...defaultProps} />);
    expect(screen.getByText('선택지 추가')).toBeInTheDocument();
  });

  describe('선택지 입력', () => {
    it('선택지 값을 입력하면 onUpdateOption이 호출되어야 한다', async () => {
      const user = userEvent.setup();
      const onUpdateOption = vi.fn();

      render(
        <PollOptionListSection
          {...defaultProps}
          onUpdateOption={onUpdateOption}
        />,
      );

      const input = screen.getByPlaceholderText('선택지 1');
      await user.clear(input);
      await user.type(input, '새로운 값');

      expect(onUpdateOption).toHaveBeenCalled();
      expect(onUpdateOption).toHaveBeenCalledWith('option-1', expect.any(String));
    });
  });

  describe('선택지 삭제', () => {
    it('삭제 버튼을 클릭하면 onDeleteOption이 호출되어야 한다', async () => {
      const user = userEvent.setup();
      const onDeleteOption = vi.fn();

      render(
        <PollOptionListSection
          {...defaultProps}
          onDeleteOption={onDeleteOption}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
      await user.click(deleteButtons[0]);

      expect(onDeleteOption).toHaveBeenCalledWith('option-1');
    });

    it('canDelete가 false이면 삭제 버튼이 비활성화되어야 한다', () => {
      render(
        <PollOptionListSection
          {...defaultProps}
          canDelete={false}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('canDelete가 true이면 삭제 버튼이 활성화되어야 한다', () => {
      render(
        <PollOptionListSection
          {...defaultProps}
          canDelete={true}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
      deleteButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('선택지 추가', () => {
    it('추가 버튼을 클릭하면 onAddOption이 호출되어야 한다', async () => {
      const user = userEvent.setup();
      const onAddOption = vi.fn();

      render(
        <PollOptionListSection
          {...defaultProps}
          onAddOption={onAddOption}
        />,
      );

      const addButton = screen.getByText('선택지 추가');
      await user.click(addButton);

      expect(onAddOption).toHaveBeenCalledTimes(1);
    });

    it('canAddMore가 false이면 추가 버튼이 비활성화되어야 한다', () => {
      render(
        <PollOptionListSection
          {...defaultProps}
          canAddMore={false}
        />,
      );

      const addButton = screen.getByText('선택지 추가').closest('button');
      expect(addButton).toBeDisabled();
    });

    it('canAddMore가 true이면 추가 버튼이 활성화되어야 한다', () => {
      render(
        <PollOptionListSection
          {...defaultProps}
          canAddMore={true}
        />,
      );

      const addButton = screen.getByText('선택지 추가').closest('button');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('접근성', () => {
    it('각 삭제 버튼에 적절한 aria-label이 있어야 한다', () => {
      render(<PollOptionListSection {...defaultProps} />);

      expect(screen.getByRole('button', { name: '선택지 1 삭제' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '선택지 2 삭제' })).toBeInTheDocument();
    });
  });

  describe('빈 선택지', () => {
    it('값이 비어있는 선택지도 렌더링해야 한다', () => {
      const emptyOptions: PollOption[] = [
        { id: 'option-1', value: '' },
        { id: 'option-2', value: '' },
      ];

      render(
        <PollOptionListSection
          {...defaultProps}
          options={emptyOptions}
        />,
      );

      expect(screen.getByPlaceholderText('선택지 1')).toHaveValue('');
      expect(screen.getByPlaceholderText('선택지 2')).toHaveValue('');
    });
  });
});
