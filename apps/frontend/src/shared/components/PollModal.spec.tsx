import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PollModal } from './PollModal';
import { type PollFormValues } from '../constants/poll';

describe('PollModal', () => {
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
      render(<PollModal {...defaultProps} />);

      expect(screen.getByText('새로운 투표 추가')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
    });

    it('수정 모드일 때 올바른 제목과 버튼이 렌더링된다', () => {
      render(
        <PollModal
          {...defaultProps}
          isEditMode
        />,
      );

      expect(screen.getByText('투표 수정')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
    });

    it('isOpen이 false일 때 모달이 렌더링되지 않는다', () => {
      render(
        <PollModal
          {...defaultProps}
          isOpen={false}
        />,
      );

      expect(screen.queryByText('새로운 투표 추가')).not.toBeInTheDocument();
    });

    it('모달의 모든 필수 필드가 렌더링된다', () => {
      render(<PollModal {...defaultProps} />);

      expect(screen.getByText('투표 제목')).toBeInTheDocument();
      expect(screen.getByText('투표 선택지')).toBeInTheDocument();
      expect(screen.getByText('제한 시간')).toBeInTheDocument();
    });

    it('기본적으로 2개의 선택지 입력 필드가 렌더링된다', () => {
      render(<PollModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('선택지 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('선택지 2')).toBeInTheDocument();
    });
  });

  describe('투표 제목 입력', () => {
    it('투표 제목을 입력할 수 있다', async () => {
      const user = userEvent.setup();
      render(<PollModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '점심 메뉴 투표');

      expect(titleInput).toHaveValue('점심 메뉴 투표');
    });
  });

  describe('투표 선택지 관리', () => {
    it('선택지에 텍스트를 입력할 수 있다', async () => {
      const user = userEvent.setup();
      render(<PollModal {...defaultProps} />);

      const option1 = screen.getByPlaceholderText('선택지 1');
      const option2 = screen.getByPlaceholderText('선택지 2');

      await user.type(option1, '한식');
      await user.type(option2, '중식');

      expect(option1).toHaveValue('한식');
      expect(option2).toHaveValue('중식');
    });

    it('선택지 추가 버튼이 렌더링된다', () => {
      render(<PollModal {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /선택지 추가/ });
      expect(addButton).toBeInTheDocument();
      expect(addButton).not.toBeDisabled();
    });

    it('최소 개수일 때 선택지 삭제 버튼이 비활성화된다', () => {
      render(<PollModal {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /선택지 \d+ 삭제/ });

      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('초기에 2개의 선택지가 렌더링된다', () => {
      render(<PollModal {...defaultProps} />);

      const inputs = screen.getAllByPlaceholderText(/선택지 \d+/);
      expect(inputs).toHaveLength(2);
    });

    it('최대 선택지 개수가 5개로 제한된다', () => {
      const initialData: PollFormValues = {
        title: '테스트',
        options: [{ value: '1' }, { value: '2' }, { value: '3' }, { value: '4' }, { value: '5' }],
        timeLimit: 0,
      };

      render(
        <PollModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      const addButton = screen.getByRole('button', { name: /선택지 추가/ });
      expect(addButton).toBeDisabled();
    });

    it('최소 개수보다 많을 때 삭제 버튼이 활성화된다', () => {
      const initialData: PollFormValues = {
        title: '테스트',
        options: [{ value: '1' }, { value: '2' }, { value: '3' }],
        timeLimit: 0,
      };

      render(
        <PollModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /선택지 \d+ 삭제/ });

      deleteButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('폼 제출', () => {
    it('유효한 데이터로 폼을 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(<PollModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '점심 메뉴 투표');

      const option1 = screen.getByPlaceholderText('선택지 1');
      const option2 = screen.getByPlaceholderText('선택지 2');
      await user.type(option1, '한식');
      await user.type(option2, '중식');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: '점심 메뉴 투표',
          options: [{ value: '한식' }, { value: '중식' }],
          timeLimit: 0,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('폼이 유효하지 않을 때 제출 버튼이 비활성화된다', async () => {
      render(<PollModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: '추가하기' });

      expect(submitButton).toBeDisabled();
    });

    it('제출 후 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<PollModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), '투표 제목');
      await user.type(screen.getByPlaceholderText('선택지 1'), '선택지1');
      await user.type(screen.getByPlaceholderText('선택지 2'), '선택지2');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('수정 모드', () => {
    const initialData: PollFormValues = {
      title: '기존 투표 제목',
      options: [{ value: '선택지A' }, { value: '선택지B' }, { value: '선택지C' }],
      timeLimit: 60,
    };

    it('초기 데이터가 폼에 표시된다', async () => {
      render(
        <PollModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
        expect(titleInput).toHaveValue('기존 투표 제목');
      });

      const option1 = screen.getByPlaceholderText('선택지 1');
      const option2 = screen.getByPlaceholderText('선택지 2');
      const option3 = screen.getByPlaceholderText('선택지 3');

      expect(option1).toHaveValue('선택지A');
      expect(option2).toHaveValue('선택지B');
      expect(option3).toHaveValue('선택지C');
    });

    it('수정된 데이터로 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(
        <PollModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toHaveValue(
          '기존 투표 제목',
        );
      });

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.clear(titleInput);
      await user.type(titleInput, '수정된 투표 제목');

      const submitButton = screen.getByRole('button', { name: '수정하기' });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '수정된 투표 제목',
          }),
        );
      });
    });
  });

  describe('모달 닫기', () => {
    it('닫기 버튼을 클릭하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<PollModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: '모달 닫기' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('폼 초기화', () => {
    it('생성 모드에서 모달이 열릴 때마다 폼이 기본값으로 초기화된다', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <PollModal
          {...defaultProps}
          isOpen={false}
        />,
      );

      rerender(<PollModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), '테스트 제목');

      rerender(
        <PollModal
          {...defaultProps}
          isOpen={false}
        />,
      );
      rerender(<PollModal {...defaultProps} />);

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
        expect(titleInput).toHaveValue('');
      });
    });

    it('수정 모드에서 모달이 열릴 때 초기 데이터로 재설정된다', async () => {
      const initialData: PollFormValues = {
        title: '초기 제목',
        options: [{ value: '옵션1' }, { value: '옵션2' }],
        timeLimit: 30,
      };

      const { rerender } = render(
        <PollModal
          {...defaultProps}
          isEditMode
          initialData={initialData}
          isOpen={false}
        />,
      );

      rerender(
        <PollModal
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
});
