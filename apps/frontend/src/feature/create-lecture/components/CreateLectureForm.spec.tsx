import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { CreateLectureForm } from './CreateLectureForm';
import { useCreateRoom } from '../hooks/useCreateRoom';
import { useRoomStore } from '../../../feature/room/stores/useRoomStore';
import { useNavigate } from 'react-router';
import { logger } from '../../../shared/lib/logger';

type RoomStoreState = Parameters<Parameters<typeof useRoomStore>[0]>[0];

vi.mock('../hooks/useCreateRoom');
vi.mock('@/feature/room/stores/useRoomStore');
vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('./ActivityList', () => ({
  ActivityList: () => <div data-testid="activity-list">ActivityList Mock</div>,
}));

vi.mock('./ActivityModals', () => ({
  ActivityModals: () => null,
}));

vi.mock('./LecturePresentationUpload', () => ({
  LecturePresentationUpload: ({ onFileSelect }: { onFileSelect: (file: File) => void }) => (
    <button
      onClick={() => onFileSelect(new File(['content'], 'test.pdf', { type: 'application/pdf' }))}
    >
      파일 업로드 버튼
    </button>
  ),
}));

vi.mock('./LecturePresentationList', () => ({
  LecturePresentationList: () => null,
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { ui: { error: vi.fn(), info: vi.fn() } },
}));

describe('CreateLectureForm (비즈니스 로직 테스트)', () => {
  const mockCreateRoom = vi.fn();
  const mockSetMyInfo = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useCreateRoom).mockReturnValue({
      createRoom: mockCreateRoom,
      isSubmitting: false,
    });
    vi.mocked(useRoomStore).mockImplementation((selector) =>
      selector({
        actions: {
          setMyInfo: mockSetMyInfo,
        },
      } as unknown as RoomStoreState),
    );
  });

  describe('파일 업로드 로직', () => {
    it('파일 업로드 시 동일한 파일이 있으면 에러 로그를 남긴다', async () => {
      const user = userEvent.setup();
      render(<CreateLectureForm />);

      const uploadBtn = screen.getByText('파일 업로드 버튼');

      await user.click(uploadBtn);
      await user.click(uploadBtn);

      expect(logger.ui.error).toHaveBeenCalledWith(
        '파일 업로드 에러:',
        '이미 동일한 파일이 업로드되어 있습니다.',
      );
    });
  });

  describe('폼 제출 프로세스', () => {
    it('유효한 데이터를 입력하고 제출하면 createRoom과 후속 조치가 실행된다', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        roomId: 'room-123',
        host: { id: 'host-1', name: '호눅스' },
      };
      mockCreateRoom.mockResolvedValueOnce(mockResponse);

      render(<CreateLectureForm />);

      const nameInput = screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택');
      const hostInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });

      await user.type(nameInput, '신규 웹 풀스택 강의실');
      await user.type(hostInput, '호눅스');
      await user.click(checkbox);

      await waitFor(() => expect(submitButton).not.toBeDisabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalled();
        expect(mockSetMyInfo).toHaveBeenCalledWith(mockResponse.host);
        expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('room-123'));
      });
    });

    it('제출 중(isSubmitting)일 때 버튼이 비활성화되고 문구가 변경된다', () => {
      vi.mocked(useCreateRoom).mockReturnValue({
        createRoom: mockCreateRoom,
        isSubmitting: true,
      });

      render(<CreateLectureForm />);

      const submitButton = screen.getByRole('button', { name: '생성 중...' });
      expect(submitButton).toBeDisabled();
    });

    it('생성 실패 시 alert 창이 나타나야 한다', async () => {
      const user = userEvent.setup();
      const mockError = '서버 에러';
      mockCreateRoom.mockRejectedValueOnce(mockError);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CreateLectureForm />);

      await user.type(screen.getByPlaceholderText(/네이버부스트캠프/), '테스트용 강의실 이름');
      await user.type(screen.getByPlaceholderText(/호눅스/), '호스트');
      await user.click(screen.getByRole('checkbox'));

      const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });
      await waitFor(() => expect(submitButton).not.toBeDisabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining(mockError));
      });

      alertSpy.mockRestore();
    });
  });
});
