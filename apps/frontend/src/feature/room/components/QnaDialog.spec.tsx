import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { QnaDialog } from './QnaDialog';

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

const mockQna = {
  id: 'qna-1',
  title: '질문 제목입니다',
  isPublic: true,
  timeLimit: 300,
};

describe('QnaDialog', () => {
  it('Q&A가 없으면 안내 문구가 렌더링된다', () => {
    render(<QnaDialog startedAt={Date.now()} />);

    expect(screen.getByText('현재 진행중인 Q&A가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Q&A 제목, 입력창, 버튼이 렌더링된다', () => {
    render(
      <QnaDialog
        qna={mockQna}
        startedAt={Date.now()}
      />,
    );

    expect(screen.getByText('질문 제목입니다')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('답변을 입력해 주세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '답변 보내기' })).toBeInTheDocument();

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveTextContent('timer');
    expect(icon).toHaveAttribute('data-size', '16');
  });
});
