import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLectureForm } from './CreateLectureForm';
import '@testing-library/jest-dom';

vi.mock('./ActivityList', () => ({
  ActivityList: () => <div>ActivityList Mock</div>,
}));

vi.mock('./ActivityModals', () => ({
  ActivityModals: () => null,
}));

vi.mock('./LecturePresentationUpload', () => ({
  LecturePresentationUpload: ({ onFileSelect }: { onFileSelect: (file: File) => void }) => (
    <button onClick={() => onFileSelect(new File(['test'], 'test.pdf'))}>파일 업로드 Mock</button>
  ),
}));

vi.mock('./LecturePresentationList', () => ({
  LecturePresentationList: () => null,
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    ui: {
      info: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('CreateLectureForm 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('폼의 모든 섹션이 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    expect(screen.getByText('강의실 이름')).toBeInTheDocument();
    expect(screen.getByText('호스트 이름')).toBeInTheDocument();
    expect(screen.getByText('데이터 수집 동의')).toBeInTheDocument();
    expect(screen.getByText('강의 활동 구성')).toBeInTheDocument();
    expect(screen.getByText('발표 자료')).toBeInTheDocument();
  });

  it('강의실 이름 입력 필드가 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    const input = screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택');
    expect(input).toBeInTheDocument();
  });

  it('호스트 이름 입력 필드가 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    const input = screen.getByPlaceholderText('예: 호눅스');
    expect(input).toBeInTheDocument();
  });

  it('데이터 수집 동의 체크박스가 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText('데이터 수집에 동의합니다.')).toBeInTheDocument();
  });

  it('투표 추가 버튼과 Q&A 추가 버튼이 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    expect(screen.getByRole('button', { name: /투표 추가/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Q&A 추가/ })).toBeInTheDocument();
  });

  it('강의실 생성하기 버튼이 렌더링되어야 한다.', () => {
    render(<CreateLectureForm />);

    expect(screen.getByRole('button', { name: '강의실 생성하기' })).toBeInTheDocument();
  });

  it('초기 상태에서 강의실 생성하기 버튼이 비활성화되어야 한다.', () => {
    render(<CreateLectureForm />);

    const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });
    expect(submitButton).toBeDisabled();
  });

  it('강의실 이름을 입력할 수 있어야 한다.', async () => {
    render(<CreateLectureForm />);

    const input = screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '테스트 강의실' } });

    await waitFor(() => {
      expect(input.value).toBe('테스트 강의실');
    });
  });

  it('호스트 이름을 입력할 수 있어야 한다.', async () => {
    render(<CreateLectureForm />);

    const input = screen.getByPlaceholderText('예: 호눅스') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '테스트 호스트' } });

    await waitFor(() => {
      expect(input.value).toBe('테스트 호스트');
    });
  });

  it('데이터 수집 동의 체크박스를 클릭할 수 있어야 한다.', async () => {
    render(<CreateLectureForm />);

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
    });
  });

  it('모든 필수 필드가 유효하면 제출 버튼이 활성화되어야 한다.', async () => {
    render(<CreateLectureForm />);

    const nameInput = screen.getByPlaceholderText('예: 네이버부스트캠프 웹 풀스택');
    const hostInput = screen.getByPlaceholderText('예: 호눅스');
    const checkbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: '강의실 생성하기' });

    fireEvent.change(nameInput, { target: { value: '테스트 강의실' } });
    fireEvent.change(hostInput, { target: { value: '테스트호스트' } });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('데이터 수집 동의 항목들이 표시되어야 한다.', () => {
    render(<CreateLectureForm />);

    expect(screen.getByText(/참여도·발화 분석 데이터를 수집합니다/)).toBeInTheDocument();
    expect(screen.getByText(/투표·질문 응답 데이터를 수집합니다/)).toBeInTheDocument();
    expect(screen.getByText(/제스처·반응 데이터를 수집합니다/)).toBeInTheDocument();
  });
});
