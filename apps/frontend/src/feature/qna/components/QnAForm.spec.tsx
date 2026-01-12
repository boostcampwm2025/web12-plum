import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QnAFormValues, qnaFormSchema } from '../schema';
import '@testing-library/jest-dom';
import { QnAForm } from './QnAForm';

const TestWrapper = ({ onSubmit }: { onSubmit: (data: QnAFormValues) => void }) => {
  const methods = useForm<QnAFormValues>({
    resolver: zodResolver(qnaFormSchema),
    defaultValues: {
      title: '',
      timeLimit: 0,
      isPublic: false,
    },
    mode: 'onChange',
  });
  return (
    <QnAForm
      formMethods={methods}
      onSubmit={onSubmit}
      submitLabel="제출하기"
    />
  );
};

describe('QnAForm Feature 테스트', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('초기 렌더링 시 제목 입력란과 제출 버튼이 있어야 한다.', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    expect(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출하기' })).toBeInTheDocument();
  });

  it('필수 값을 입력하지 않으면 제출 버튼이 비활성화되어야 한다.', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: '제출하기' });
    expect(submitButton).toBeDisabled();
  });

  it('제목(1자 이상)을 입력하면 제출 버튼이 활성화되어야 한다.', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
    const submitButton = screen.getByRole('button', { name: '제출하기' });

    fireEvent.change(input, { target: { value: '테스트 질문입니다' } });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('제출 버튼을 클릭하면 onSubmit 함수가 입력된 데이터와 함께 호출되어야 한다.', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('무엇을 묻고 싶으신가요?');
    const checkbox = screen.getByLabelText('익명으로 답변 전체 공개');
    const submitButton = screen.getByRole('button', { name: '제출하기' });

    fireEvent.change(input, { target: { value: '새로운 질문' } });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '새로운 질문',
          isPublic: true,
        }),
        expect.anything(),
      );
    });
  });

  it('TimeLimitDropdown을 통해 제한 시간을 변경할 수 있어야 한다.', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const dropdown = screen.getByText('제한 없음');
    fireEvent.click(dropdown);

    const option = screen.getByText('30초');
    fireEvent.click(option);

    fireEvent.change(screen.getByPlaceholderText('무엇을 묻고 싶으신가요?'), {
      target: { value: '시간 제한 테스트' },
    });

    const submitButton = screen.getByRole('button', { name: '제출하기' });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          timeLimit: 30,
        }),
        expect.anything(),
      );
    });
  });
});
