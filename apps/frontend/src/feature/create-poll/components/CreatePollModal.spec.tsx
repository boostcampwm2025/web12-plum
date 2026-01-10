import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreatePollModal } from './CreatePollModal';
import * as usePollOptionsModule from '../hooks/usePollOptions';

const mockUsePollOptions = vi.fn();
vi.spyOn(usePollOptionsModule, 'usePollOptions').mockImplementation(mockUsePollOptions);

describe('CreatePollModal', () => {
  const mockOnClose = vi.fn();
  const mockAddOption = vi.fn();
  const mockDeleteOption = vi.fn();
  const mockUpdateOption = vi.fn();
  const mockResetOptions = vi.fn();

  const defaultUsePollOptionsReturn = {
    options: [
      { id: 'option-1', value: '' },
      { id: 'option-2', value: '' },
    ],
    addOption: mockAddOption,
    deleteOption: mockDeleteOption,
    updateOption: mockUpdateOption,
    resetOptions: mockResetOptions,
    canAddMore: true,
    canDelete: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePollOptions.mockReturnValue(defaultUsePollOptionsReturn);
  });

  describe('렌더링', () => {
    it('모달이 열려있을 때 컴포넌트가 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('새로운 투표 추가')).toBeInTheDocument();
    });

    it('모달이 닫혀있을 때 컴포넌트가 렌더링되지 않는다', () => {
      render(
        <CreatePollModal
          isOpen={false}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('새로운 투표 추가')).not.toBeInTheDocument();
    });

    it('모든 필수 폼 섹션이 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('투표 제목')).toBeInTheDocument();
      expect(screen.getByText('투표 선택지')).toBeInTheDocument();
      expect(screen.getByText('제한 시간')).toBeInTheDocument();
    });

    it('투표 제목 입력 필드가 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toBeInTheDocument();
    });

    it('선택지 추가 버튼이 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('선택지 추가')).toBeInTheDocument();
    });

    it('추가하기 버튼이 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
    });
  });

  describe('모달 닫기', () => {
    it('닫기 버튼을 클릭하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole('button', { name: '모달 닫기' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('투표 제목 입력', () => {
    it('투표 제목을 입력할 수 있다', async () => {
      const user = userEvent.setup();
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '좋아하는 과일은?');

      expect(titleInput).toHaveValue('좋아하는 과일은?');
    });
  });

  describe('선택지 관리', () => {
    it('PollOptionList 컴포넌트가 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByPlaceholderText('선택지 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('선택지 2')).toBeInTheDocument();
    });

    it('선택지 추가 버튼을 클릭하면 addOption이 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const addButton = screen.getByText('선택지 추가');
      await user.click(addButton);

      expect(mockAddOption).toHaveBeenCalledTimes(1);
    });

    it('canAddMore가 false일 때 선택지 추가 버튼이 비활성화된다', () => {
      mockUsePollOptions.mockReturnValue({
        ...defaultUsePollOptionsReturn,
        canAddMore: false,
      });

      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const addButton = screen.getByText('선택지 추가').closest('button');
      expect(addButton).toBeDisabled();
    });
  });

  describe('폼 유효성 검사', () => {
    it('폼이 유효하지 않을 때 추가하기 버튼이 비활성화된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      expect(submitButton).toBeDisabled();
    });

    it('폼이 유효할 때 추가하기 버튼이 활성화된다', async () => {
      const user = userEvent.setup();

      mockUsePollOptions.mockReturnValue({
        ...defaultUsePollOptionsReturn,
        options: [
          { id: 'option-1', value: '사과' },
          { id: 'option-2', value: '바나나' },
        ],
      });

      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '좋아하는 과일은?');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: '추가하기' });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('폼 제출', () => {
    it('유효한 폼을 제출하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();

      mockUsePollOptions.mockReturnValue({
        ...defaultUsePollOptionsReturn,
        options: [
          { id: 'option-1', value: '사과' },
          { id: 'option-2', value: '바나나' },
        ],
      });

      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '좋아하는 과일은?');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('유효하지 않은 폼을 제출하면 onClose가 호출되지 않는다', async () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      // 유효하지 않은 폼 제출 시도 (빈 제목, 빈 선택지)
      const form = screen.getByRole('button', { name: '추가하기' }).closest('form');
      if (form) {
        // 비활성화된 버튼을 우회하여 직접 제출
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }

      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('제한 시간 설정', () => {
    it('TimeLimitDropdown 컴포넌트가 렌더링된다', () => {
      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('제한 없음')).toBeInTheDocument();
    });
  });

  describe('폼 초기화', () => {
    it('모달을 닫을 때 폼이 초기화된다', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '테스트 제목');

      const closeButton = screen.getByRole('button', { name: '모달 닫기' });
      await user.click(closeButton);

      rerender(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const newTitleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      expect(newTitleInput).toHaveValue('');
    });

    it('폼 제출 후 폼이 초기화된다', async () => {
      const user = userEvent.setup();

      mockUsePollOptions.mockReturnValue({
        ...defaultUsePollOptionsReturn,
        options: [
          { id: 'option-1', value: '사과' },
          { id: 'option-2', value: '바나나' },
        ],
      });

      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '좋아하는 과일은?');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetOptions).toHaveBeenCalled();
      });
    });
  });

  describe('통합 시나리오', () => {
    it('전체 투표 생성 플로우가 정상적으로 작동한다', async () => {
      const user = userEvent.setup();

      mockUsePollOptions.mockReturnValue({
        ...defaultUsePollOptionsReturn,
        options: [
          { id: 'option-1', value: '사과' },
          { id: 'option-2', value: '바나나' },
          { id: 'option-3', value: '오렌지' },
        ],
        canAddMore: true,
        canDelete: true,
      });

      render(
        <CreatePollModal
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const titleInput = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
      await user.type(titleInput, '좋아하는 과일은?');

      const submitButton = screen.getByRole('button', { name: '추가하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
