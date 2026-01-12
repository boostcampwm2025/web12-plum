import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateQnAModal } from './CreateQnAModal';
import '@testing-library/jest-dom';

describe('CreateQnAModal Feature 테스트', () => {
  const mockOnClose = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen이 true일 때 모달과 내부 폼이 렌더링되어야 한다.', () => {
    render(
      <CreateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    expect(screen.getByText('새로운 QnA 추가')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toBeInTheDocument();
  });

  it('isOpen이 false일 때 아무것도 렌더링되지 않아야 한다.', () => {
    const { queryByText } = render(
      <CreateQnAModal
        isOpen={false}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    expect(queryByText('새로운 QnA 추가')).not.toBeInTheDocument();
  });

  it('폼을 작성하고 추가하기 버튼을 누르면 onCreate가 호출되고 모달이 닫혀야 한다.', async () => {
    render(
      <CreateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
    const submitButton = screen.getByRole('button', { name: '추가하기' });

    fireEvent.change(input, { target: { value: '질문 있습니다!' } });

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '질문 있습니다!',
        }),
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('닫기 버튼을 누르면 onClose가 호출되어야 한다.', () => {
    render(
      <CreateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /모달 닫기/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
