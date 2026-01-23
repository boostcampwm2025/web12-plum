import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { CreateLectureForm } from './CreateLectureForm';
import { useCreateRoom } from '../hooks/useCreateRoom';
import { useNavigate } from 'react-router';
import { useToastStore } from '../../../store/useToastStore';
import { logger } from '../../../shared/lib/logger';

vi.mock('../hooks/useCreateRoom');
vi.mock('react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/store/useToastStore', () => ({ useToastStore: vi.fn() }));
vi.mock('@/shared/lib/logger', () => ({
  logger: { ui: { error: vi.fn(), info: vi.fn() } },
}));

vi.mock('./ActivityList', () => ({ ActivityList: () => null }));
vi.mock('./ActivityModals', () => ({ ActivityModals: () => null }));
vi.mock('./PresentationSection', () => ({ PresentationSection: () => null }));

describe('CreateLectureForm 통합 테스트', () => {
  const mockCreateRoom = vi.fn();
  const mockNavigate = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useCreateRoom).mockReturnValue({
      createRoom: mockCreateRoom,
      isSubmitting: false,
    });

    vi.mocked(useToastStore).mockImplementation((selector: any) =>
      selector({
        actions: { addToast: mockAddToast },
      }),
    );
  });

  it('유효한 데이터를 입력하고 제출하면 페이지를 이동한다', async () => {
    const user = userEvent.setup();
    mockCreateRoom.mockResolvedValueOnce({ roomId: 'room-123' });

    render(<CreateLectureForm />);

    const nameInput = screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택');
    const hostInput = screen.getByPlaceholderText('예: 호눅스');
    const checkbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });

    await user.type(nameInput, '테스트 강의실');
    await user.type(hostInput, '테스트 호스트');
    await user.click(checkbox);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('room-123'));
    });
  });

  it('생성 실패 시 에러 토스트를 호출한다', async () => {
    const user = userEvent.setup();
    mockCreateRoom.mockRejectedValueOnce(new Error('네트워크 에러'));

    render(<CreateLectureForm />);

    await user.type(screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택'), '실패 테스트');
    await user.type(screen.getByPlaceholderText('예: 호눅스'), '호스트');
    await user.click(screen.getByRole('checkbox'));

    const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: expect.any(String),
        }),
      );
    });
    expect(logger.ui.error).toHaveBeenCalled();
  });
});
