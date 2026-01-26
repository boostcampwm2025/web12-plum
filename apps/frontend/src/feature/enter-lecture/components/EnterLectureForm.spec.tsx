import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router';

import { EnterLectureForm } from './EnterLectureForm';
import { useEnterRoom } from '../hooks/useEnterRoom';
import { useNicknameValidation } from '../hooks/useNicknameValidation';

vi.mock('../hooks/useEnterRoom');
vi.mock('../hooks/useNicknameValidation');
vi.mock('@/shared/lib/logger');
vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('./LocalMediaPreview', () => ({
  LocalMediaPreview: () => <div data-testid="media-preview">미디어 프리뷰</div>,
}));

const mockUseEnterRoom = vi.mocked(useEnterRoom);
const mockUseNicknameValidation = vi.mocked(useNicknameValidation);
const mockNavigate = vi.fn();
vi.mocked(useNavigate).mockReturnValue(mockNavigate);

describe('EnterLectureForm (비즈니스 로직 포함)', () => {
  const mockEnterRoom = vi.fn();
  const mockHandleCheckNickname = vi.fn();
  const mockRequireCheck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    mockUseEnterRoom.mockReturnValue({
      enterRoom: mockEnterRoom,
      isSubmitting: false,
    });

    mockUseNicknameValidation.mockReturnValue({
      nicknameValue: '',
      checkMessage: '',
      checkVariant: 'default',
      hasCheckedNickname: false,
      isNicknameAvailable: false,
      handleCheckNickname: mockHandleCheckNickname,
      requireCheck: mockRequireCheck,
    });
  });

  describe('닉네임 중복 확인 연동 테스트', () => {
    it('중복 확인을 하지 않고 제출 시도 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      render(
        <EnterLectureForm
          roomId="room-1"
          lectureName="테스트 강의실"
        />,
      );

      await user.type(screen.getByPlaceholderText('예: 호눅스'), '호눅스');
      await user.click(screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' }));

      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });
      await user.click(submitButton);

      expect(mockRequireCheck).toHaveBeenCalled();
      expect(mockEnterRoom).not.toHaveBeenCalled();
    });

    it('중복 확인 성공 후 입장이 가능하다', async () => {
      const user = userEvent.setup();

      mockUseNicknameValidation.mockReturnValue({
        nicknameValue: '호눅스',
        checkMessage: '',
        checkVariant: 'success',
        hasCheckedNickname: true,
        isNicknameAvailable: true,
        handleCheckNickname: mockHandleCheckNickname,
        requireCheck: mockRequireCheck,
      });

      render(<EnterLectureForm roomId="room-1" />);

      await user.type(screen.getByPlaceholderText('예: 호눅스'), '호눅스');
      await user.click(screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' }));

      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });
      await user.click(submitButton);

      expect(mockEnterRoom).toHaveBeenCalled();
    });
  });

  describe('입장 중 상태 처리', () => {
    it('제출 중일 때 버튼 문구가 변경되고 비활성화된다', () => {
      mockUseEnterRoom.mockReturnValue({
        enterRoom: mockEnterRoom,
        isSubmitting: true,
      });

      render(<EnterLectureForm roomId="room-1" />);

      const submitButton = screen.getByRole('button', { name: '입장 중...' });
      expect(submitButton).toBeDisabled();
    });
  });
});
