import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PollForm } from './PollForm';
import { pollFormSchema, PollFormValues } from '../schema';
import { MAX_POLL_OPTIONS } from '../constants';

const TestWrapper = ({ onSubmit }: { onSubmit: (data: PollFormValues) => void }) => {
  const formMethods = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      options: [{ value: '' }, { value: '' }],
      timeLimit: 0,
    },
  });

  return (
    <PollForm
      formMethods={formMethods}
      onSubmit={onSubmit}
      submitLabel="제출하기"
    />
  );
};

describe('PollForm', () => {
  const user = userEvent.setup();
  const mockSubmit = vi.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('모든 필수 항목이 올바르게 입력되면 제출 버튼이 활성화되어야 한다', async () => {
    render(<TestWrapper onSubmit={mockSubmit} />);
    const submitButton = screen.getByRole('button', { name: '제출하기' });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/), '오늘의 점심');
    await user.type(screen.getByPlaceholderText('선택지 1'), '짜장면');
    await user.type(screen.getByPlaceholderText('선택지 2'), '짬뽕');

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('선택지 추가 버튼을 누르면 새로운 입력창이 나타나야 한다', async () => {
    render(<TestWrapper onSubmit={mockSubmit} />);

    const addButton = screen.getByRole('button', { name: /선택지 추가/ });
    await user.click(addButton);

    expect(screen.getByPlaceholderText('선택지 3')).toBeInTheDocument();
  });

  it(`선택지가 최대 개수(${MAX_POLL_OPTIONS})에 도달하면 추가 버튼이 비활성화되어야 한다`, async () => {
    render(<TestWrapper onSubmit={mockSubmit} />);
    const addButton = screen.getByRole('button', { name: /선택지 추가/ });

    for (let i = 0; i < MAX_POLL_OPTIONS - 2; i++) {
      await user.click(addButton);
    }

    expect(addButton).toBeDisabled();
  });

  it('제출 시 입력된 데이터가 올바른 구조로 onSubmit 핸들러에 전달되어야 한다', async () => {
    render(<TestWrapper onSubmit={mockSubmit} />);

    await user.type(screen.getByPlaceholderText(/무엇을 묻고 싶으신가요/), '간식 투표');
    await user.type(screen.getByPlaceholderText('선택지 1'), '치킨');
    await user.type(screen.getByPlaceholderText('선택지 2'), '피자');

    const submitButton = screen.getByRole('button', { name: '제출하기' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        {
          title: '간식 투표',
          options: [{ value: '치킨' }, { value: '피자' }],
          timeLimit: 0,
        },
        expect.anything(),
      );
    });
  });

  it('커스텀 드롭다운을 통해 시간이 변경되면 폼 상태에 반영되어야 한다', async () => {
    render(<TestWrapper onSubmit={mockSubmit} />);

    const dropdownButton = screen.getByRole('button', { name: /제한 없음/ });
    await user.click(dropdownButton);

    const option1Min = screen.getByText('1분');
    await user.click(option1Min);

    expect(screen.getByText('1분')).toBeInTheDocument();
  });
});
