import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CreatePollModal } from './CreatePollModal';

describe('CreatePollModal', () => {
  const user = userEvent.setup();
  const mockOnCreate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('사용자가 유효한 데이터를 입력하고 "추가하기"를 누르면 onCreate가 호출되고 폼이 초기화되어야 한다', async () => {
    render(
      <CreatePollModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    const titleInput = screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/i);
    await user.type(titleInput, '새로운 테스트 투표');

    const optionInputs = screen.getAllByPlaceholderText(/선택지 \d/);
    await user.type(optionInputs[0], '사과');
    await user.type(optionInputs[1], '바나나');

    const submitButton = screen.getByRole('button', { name: /추가하기/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith({
        title: '새로운 테스트 투표',
        options: [{ value: '사과' }, { value: '바나나' }],
        timeLimit: 0,
      });
    });

    expect(mockOnClose).toHaveBeenCalled();

    expect(titleInput).toHaveValue('');
  });

  it('필수 입력값이 누락되었을 때 "추가하기" 버튼이 비활성화 상태여야 한다', async () => {
    render(
      <CreatePollModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    await user.type(screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/i), '제목만 있음');

    const submitButton = screen.getByRole('button', { name: /추가하기/i });
    expect(submitButton).toBeDisabled();
  });

  it('닫기 버튼 클릭 시 onClose가 호출되어야 한다', async () => {
    render(
      <CreatePollModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /모달 닫기/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
