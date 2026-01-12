import { describe, vi, beforeEach, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateQnAModal } from './UpdateQnAModal';
import '@testing-library/jest-dom';

describe('UpdateQnAModal Feature 테스트', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  const initialData = {
    title: '기존 질문 제목',
    timeLimit: 60,
    isPublic: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialData가 폼의 초기값으로 올바르게 렌더링되어야 한다.', () => {
    render(
      <UpdateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={initialData}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.getByDisplayValue('기존 질문 제목')).toBeInTheDocument();
    expect(screen.getByText('1분')).toBeInTheDocument(); // TimeLimitDropdown 표시값 가정
    expect(screen.getByLabelText('익명으로 답변 전체 공개')).toBeChecked();
  });

  it('데이터를 수정하고 수정하기 버튼을 누르면 변경된 데이터와 함께 onUpdate가 호출되어야 한다.', async () => {
    render(
      <UpdateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={initialData}
        onUpdate={mockOnUpdate}
      />,
    );

    const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
    const submitButton = screen.getByRole('button', { name: '수정하기' });

    fireEvent.change(input, { target: { value: '수정된 질문 제목' } });

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '수정된 질문 제목',
          timeLimit: 60,
          isPublic: true,
        }),
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('수정 중에 모달을 닫으면 onUpdate는 호출되지 않고 onClose만 호출되어야 한다.', () => {
    render(
      <UpdateQnAModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={initialData}
        onUpdate={mockOnUpdate}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /모달 닫기/i });
    fireEvent.click(closeButton);

    expect(mockOnUpdate).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
