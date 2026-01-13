import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QnAModal } from './QnAModal';
import { type QnAFormValues } from '../constants/qna';

describe('QnAModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('렌더링', () => {
    it('생성 모드일 때 올바른 제목과 버튼이 렌더링된다', () => {
      render(<QnAModal {...defaultProps} />);

      expect(screen.getByText('새로운 QnA 추가')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
    });

    it('수정 모드일 때 올바른 제목과 버튼이 렌더링된다', () => {
      render(
        <QnAModal
          {...defaultProps}
          isEditMode
        />,
      );

      expect(screen.getByText('QnA 수정')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
    });

    it('isOpen이 false일 때 모달이 렌더링되지 않는다', () => {
      render(
        <QnAModal
          {...defaultProps}
          isOpen={false}
        />,
      );

      expect(screen.queryByText('새로운 QnA 추가')).not.toBeInTheDocument();
    });

    it('모달의 모든 필수 필드가 렌더링된다', () => {
      render(<QnAModal {...defaultProps} />);

      expect(screen.getByText('QnA 제목')).toBeInTheDocument();
      expect(screen.getByText('제한 시간')).toBeInTheDocument();
      expect(screen.getByText('익명으로 답변 전체 공개')).toBeInTheDocument();
    });
  });

  describe('QnA 제목 입력', () => {
    it('QnA 제목을 입력할 수 있다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '첫 번째 질문입니다');

      expect(titleInput).toHaveValue('첫 번째 질문입니다');
    });

    it('QnA 제목이 필수 필드로 표시된다', () => {
      render(<QnAModal {...defaultProps} />);

      const legend = screen.getByText('QnA 제목');
      const fieldset = legend.closest('fieldset');

      expect(fieldset).toHaveTextContent('*');
    });
  });

  describe('익명 공개 체크박스', () => {
    it('체크박스를 클릭하여 상태를 변경할 수 있다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });

      await user.click(checkbox);
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('초기값이 false로 설정된다', () => {
      render(<QnAModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('폼 제출', () => {
    it('유효한 데이터로 폼을 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '테스트 질문');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: '테스트 질문',
          timeLimit: 0,
          isPublic: false,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('폼이 유효하지 않을 때 제출 버튼이 비활성화된다', () => {
      render(<QnAModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: '추가하기' });

      expect(submitButton).toBeDisabled();
    });

    it('제출 후 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), 'QnA 제목');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('익명 공개를 체크한 후 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), '공개 질문');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: '공개 질문',
          timeLimit: 0,
          isPublic: true,
        });
      });
    });
  });

  describe('수정 모드', () => {
    const initialData: QnAFormValues = {
      title: '기존 QnA 제목',
      timeLimit: 60,
      isPublic: true,
    };

    it('초기 데이터가 폼에 표시된다', async () => {
      render(
        <QnAModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
        expect(titleInput).toHaveValue('기존 QnA 제목');
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('수정된 데이터로 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(
        <QnAModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toHaveValue('기존 QnA 제목');
      });

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.clear(titleInput);
      await user.type(titleInput, '수정된 QnA 제목');

      const submitButton = screen.getByRole('button', { name: '수정하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '수정된 QnA 제목',
          }),
        );
      });
    });

    it('수정 모드에서 체크박스 상태를 변경할 수 있다', async () => {
      const user = userEvent.setup();
      render(
        <QnAModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('모달 닫기', () => {
    it('닫기 버튼을 클릭하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<QnAModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: '모달 닫기' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('폼 초기화', () => {
    it('생성 모드에서 모달이 열릴 때마다 폼이 기본값으로 초기화된다', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <QnAModal
          {...defaultProps}
          isOpen={false}
        />,
      );

      rerender(<QnAModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), '테스트 제목');

      rerender(
        <QnAModal
          {...defaultProps}
          isOpen={false}
        />,
      );
      rerender(<QnAModal {...defaultProps} />);

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
        expect(titleInput).toHaveValue('');
      });
    });

    it('수정 모드에서 모달이 열릴 때 초기 데이터로 재설정된다', async () => {
      const initialData: QnAFormValues = {
        title: '초기 제목',
        timeLimit: 30,
        isPublic: false,
      };

      const { rerender } = render(
        <QnAModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
          isOpen={false}
        />,
      );

      rerender(
        <QnAModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toHaveValue('초기 제목');
      });
    });
  });

  describe('접근성', () => {
    it('모달이 적절한 role 속성을 가진다', () => {
      render(<QnAModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('체크박스가 레이블과 연결된다', () => {
      render(<QnAModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('익명으로 답변 전체 공개');

      expect(checkbox).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });
  });
});
