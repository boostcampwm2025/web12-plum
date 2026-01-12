import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QnAModal } from './QnAModal';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

describe('QnAModal Feature 테스트', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('생성 모드 (isEditMode = false)', () => {
    it('초기 렌더링 시 "새로운 QnA 추가" 타이틀과 빈 폼이 나타나야 한다.', () => {
      render(
        <QnAModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText('새로운 QnA 추가')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toHaveValue('');
    });

    it('폼 제출 시 데이터와 함께 onSubmit이 호출되고 폼이 리셋되어야 한다.', async () => {
      render(
        <QnAModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      fireEvent.change(input, { target: { value: '새로운 질문 테스트' } });

      const submitButton = screen.getByRole('button', { name: '추가하기' });

      await waitFor(() => expect(submitButton).not.toBeDisabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ title: '새로운 질문 테스트' }),
        );
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('수정 모드 (isEditMode = true)', () => {
    const initialData = {
      title: '기존에 작성된 질문',
      timeLimit: 180,
      isPublic: true,
    };

    it('수정 모드일 때 initialData가 폼에 채워져 있어야 한다.', () => {
      render(
        <QnAModal
          isEditMode={true}
          initialData={initialData}
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText('QnA 수정')).toBeInTheDocument();
      expect(screen.getByDisplayValue('기존에 작성된 질문')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
    });

    it('데이터 수정 후 제출 시 변경된 값이 전달되어야 한다.', async () => {
      const user = userEvent.setup();
      render(
        <QnAModal
          isEditMode={true}
          initialData={initialData}
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');

      // 기존 텍스트 지우고 새로 입력
      await user.clear(input);
      await user.type(input, '수정된 질문 제목');

      const submitButton = screen.getByRole('button', { name: '수정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ title: '수정된 질문 제목' }),
        );
      });
    });
  });

  it('닫기 버튼을 클릭하면 onClose가 호출되어야 한다.', () => {
    render(
      <QnAModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /모달 닫기/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
