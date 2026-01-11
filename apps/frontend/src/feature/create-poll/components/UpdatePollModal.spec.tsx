import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { UpdatePollModal } from './UpdatePollModal';
import { PollFormValues } from '../schema';

describe('UpdatePollModal', () => {
  const user = userEvent.setup();

  const mockInitialData: PollFormValues = {
    title: '기존 투표 제목',
    options: [{ value: '옵션 1' }, { value: '옵션 2' }],
    timeLimit: 60,
  };

  const mockOnUpdate = vi.fn();
  const mockOnClose = vi.fn();

  it('초기 렌더링 시 제공된 initialData가 폼에 올바르게 표시되어야 한다', () => {
    render(
      <UpdatePollModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={mockInitialData}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/i)).toHaveValue('기존 투표 제목');
    expect(screen.getByPlaceholderText('선택지 1')).toHaveValue('옵션 1');
    expect(screen.getByPlaceholderText('선택지 2')).toHaveValue('옵션 2');
    expect(screen.getByRole('button', { name: /1분/i })).toBeInTheDocument();
  });

  it('사용자가 데이터를 수정하고 제출하면 onUpdate가 수정된 데이터와 함께 호출되어야 한다', async () => {
    render(
      <UpdatePollModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={mockInitialData}
        onUpdate={mockOnUpdate}
      />,
    );

    const titleInput = screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/i);
    await user.clear(titleInput);
    await user.type(titleInput, '수정된 제목');

    const addOptionButton = screen.getByRole('button', { name: /선택지 추가/i });
    await user.click(addOptionButton);

    const thirdOptionInput = screen.getByPlaceholderText('선택지 3');
    await user.type(thirdOptionInput, '새 옵션');

    const submitButton = screen.getByRole('button', { name: /수정하기/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        title: '수정된 제목',
        options: [{ value: '옵션 1' }, { value: '옵션 2' }, { value: '새 옵션' }],
        timeLimit: 60,
      });
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('유효하지 않은 입력(빈 제목)이 있을 경우 수정하기 버튼이 비활성화되어야 한다', async () => {
    render(
      <UpdatePollModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={mockInitialData}
        onUpdate={mockOnUpdate}
      />,
    );

    const titleInput = screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/i);
    await user.clear(titleInput);

    const submitButton = screen.getByRole('button', { name: /수정하기/i });
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
