import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EnterLectureForm } from './EnterLectureForm';
import { useEnterRoom } from '../hooks/useEnterRoom';
import { useNicknameValidation } from '../hooks/useNicknameValidation';
import { useMediaStore } from '../../../feature/room/stores/useMediaStore';

vi.mock('../hooks/useEnterRoom');
vi.mock('../hooks/useNicknameValidation');
vi.mock('@/feature/room/stores/useMediaStore');
vi.mock('@/shared/lib/logger');

vi.mock('./LocalMediaPreview', () => ({
  LocalMediaPreview: () => <div data-testid="media-preview">미디어 프리뷰</div>,
}));

const mockUseEnterRoom = vi.mocked(useEnterRoom);
const mockUseNicknameValidation = vi.mocked(useNicknameValidation);
const mockUseMediaStore = vi.mocked(useMediaStore);

describe('EnterLectureForm (비즈니스 로직 포함)', () => {
  const mockEnterRoom = vi.fn();
  const mockInitialize = vi.fn();
  const mockHandleCheckNickname = vi.fn();
  const mockRequireCheck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEnterRoom.mockReturnValue({
      enterRoom: mockEnterRoom,
      isSubmitting: false,
    });

    mockUseMediaStore.mockImplementation((selector) =>
      selector({ actions: { initialize: mockInitialize } } as unknown as Parameters<
        typeof selector
      >[0]),
    );

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

      expect(mockInitialize).toHaveBeenCalled();
      expect(mockEnterRoom).toHaveBeenCalled();
    });
  });

  describe('미디어 장치 설정 연동', () => {
    it('토글 버튼 상태에 따라 initialize 함수에 올바른 값이 전달된다', async () => {
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
      await waitFor(() => expect(submitButton).not.toBeDisabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(false, false);
      });
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
