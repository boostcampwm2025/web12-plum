import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { QnaDialog } from './QnaDialog';
import { useQnaStore } from '../stores/useQnaStore';
import type { QnaState } from '../stores/useQnaStore';

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => (
    <svg
      data-testid="icon"
      data-size={size}
    >
      {name}
    </svg>
  ),
}));

vi.mock('../stores/useQnaStore');
vi.mock('@/shared/stores/useToastStore', () => ({
  useToastStore: vi.fn((selector: (state: { actions: { addToast: () => void } }) => unknown) =>
    selector({ actions: { addToast: vi.fn() } }),
  ),
}));
vi.mock('../services/qna', () => ({
  QnaService: { answer: vi.fn().mockResolvedValue(undefined) },
}));

const mockQna = {
  id: 'qna-1',
  roomId: '',
  status: 'active' as const,
  title: '질문 제목입니다',
  isPublic: true,
  timeLimit: 300,
  createdAt: '',
  updatedAt: '',
  startedAt: new Date().toISOString(),
  endedAt: '',
  answers: [],
};

const setupQnaMock = (qnas: QnaState['qnas'], answeredByQnaId: Record<string, boolean> = {}) => {
  vi.mocked(useQnaStore).mockImplementation(<T,>(selector: (state: QnaState) => T): T => {
    const state: QnaState = {
      qnas,
      answeredByQnaId,
      actions: {
        hydrateFromQnas: vi.fn(),
        setActiveQna: vi.fn(),
        clearActiveQna: vi.fn(),
        updateQnaSub: vi.fn(),
        updateQnaDetail: vi.fn(),
        setCompletedFromEndDetail: vi.fn(),
        setAnswered: vi.fn(),
      },
    };
    return selector(state);
  });
};

describe('QnaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Q&A가 없으면 안내 문구가 렌더링된다', () => {
    setupQnaMock([]);
    render(<QnaDialog />);

    expect(screen.getByText('현재 진행중인 Q&A가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Q&A 제목, 입력창, 버튼이 렌더링된다', () => {
    setupQnaMock([mockQna]);
    render(<QnaDialog />);

    expect(screen.getByText('질문 제목입니다')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('답변을 입력해 주세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '답변 보내기' })).toBeInTheDocument();

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveTextContent('timer');
    expect(icon).toHaveAttribute('data-size', '16');
  });
});
