import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EnterLectureForm } from './EnterLectureForm';

describe('EnterLectureForm', () => {
  describe('기본 렌더링', () => {
    it('모든 섹션이 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByText('강의실 이름')).toBeInTheDocument();
      expect(screen.getByText('닉네임')).toBeInTheDocument();
      expect(screen.getByText('데이터 수집 동의')).toBeInTheDocument();
      expect(screen.getByText('카메라 및 마이크 확인')).toBeInTheDocument();
    });

    it('강의실 입장 버튼이 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByRole('button', { name: '강의실 입장하기' })).toBeInTheDocument();
    });

    it('초기 상태에서 강의실 입장 버튼이 비활성화되어 있다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('강의실 이름 섹션', () => {
    it('강의실 이름이 읽기 전용으로 표시된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      const nameInput = screen.getByDisplayValue('예시 강의실');
      expect(nameInput).toHaveAttribute('readonly');
    });
  });

  describe('닉네임 섹션', () => {
    it('닉네임 입력 필드가 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByPlaceholderText('예: 호눅스')).toBeInTheDocument();
    });

    it('중복 확인 버튼이 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByRole('button', { name: '중복 확인' })).toBeInTheDocument();
    });

    it('닉네임을 입력할 수 있다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      await user.type(nicknameInput, '테스트닉네임');

      expect(nicknameInput).toHaveValue('테스트닉네임');
    });
  });

  describe('데이터 수집 동의 섹션', () => {
    it('데이터 수집 항목들이 표시된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByText('참여도·발화 분석 데이터를 수집합니다.')).toBeInTheDocument();
      expect(screen.getByText('투표·질문 응답 데이터를 수집합니다.')).toBeInTheDocument();
      expect(screen.getByText('제스처·반응 데이터를 수집합니다.')).toBeInTheDocument();
    });

    it('동의 체크박스가 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(
        screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' }),
      ).toBeInTheDocument();
    });

    it('동의 체크박스를 클릭할 수 있다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('카메라 및 마이크 확인 섹션', () => {
    it('마이크 토글이 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByText('마이크')).toBeInTheDocument();
    });

    it('카메라 토글이 렌더링된다', () => {
      render(<EnterLectureForm roomId="room-id" />);

      expect(screen.getByText('카메라')).toBeInTheDocument();
    });
  });

  describe('폼 유효성 검증', () => {
    it('닉네임이 2자 미만일 때 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '김');
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('닉네임이 16자를 초과할 때 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '12345678901234567'); // 17자
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('데이터 수집에 동의하지 않으면 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '테스트닉네임');

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('닉네임이 유효하고 데이터 수집에 동의하면 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '테스트닉네임');
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('폼 제출', () => {
    it('유효한 데이터로 폼을 제출할 수 있다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '테스트닉네임');
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);
    });
  });

  describe('닉네임 유효성 검증 경계값 테스트', () => {
    it('닉네임이 정확히 2자일 때 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '김철');
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('닉네임이 정확히 16자일 때 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<EnterLectureForm roomId="room-id" />);

      const nicknameInput = screen.getByPlaceholderText('예: 호눅스');
      const checkbox = screen.getByRole('checkbox', { name: '데이터 수집에 동의합니다.' });
      const submitButton = screen.getByRole('button', { name: '강의실 입장하기' });

      await user.type(nicknameInput, '1234567890123456');
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
