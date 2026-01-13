import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityList } from './ActivityList';
import { useActivityActionContext } from '../hooks/useActivityActionContext';
import { useActivityModalContext } from '../hooks/useActivityModalContext';
import '@testing-library/jest-dom';

// 커스텀 훅 모킹
vi.mock('../hooks/useActivityActionContext');
vi.mock('../hooks/useActivityModalContext');

describe('ActivityList 테스트', () => {
  const mockDeletePoll = vi.fn();
  const mockDeleteQna = vi.fn();
  const mockOpenEditPoll = vi.fn();
  const mockOpenEditQna = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'none' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: mockOpenEditPoll,
      openEditQnaModal: mockOpenEditQna,
      closeModal: vi.fn(),
    });
  });

  it('활동이 없을 때 "추가된 투표 / Q&A가 없습니다" 메시지를 렌더링해야 한다.', () => {
    vi.mocked(useActivityActionContext).mockReturnValue({
      polls: [],
      qnas: [],
      actions: {
        addPoll: vi.fn(),
        editPoll: vi.fn(),
        deletePoll: mockDeletePoll,
        addQna: vi.fn(),
        editQna: vi.fn(),
        deleteQna: mockDeleteQna,
      },
    });

    render(<ActivityList />);

    expect(screen.getByText('추가된 투표 / Q&A가 없습니다.')).toBeInTheDocument();
  });

  it('활동(투표, Q&A)이 있을 때 리스트 아이템들을 렌더링해야 한다.', () => {
    vi.mocked(useActivityActionContext).mockReturnValue({
      polls: [{ title: '테스트 투표' }],
      qnas: [{ title: '테스트 Q&A' }],
      actions: {
        addPoll: vi.fn(),
        editPoll: vi.fn(),
        deletePoll: mockDeletePoll,
        addQna: vi.fn(),
        editQna: vi.fn(),
        deleteQna: mockDeleteQna,
      },
    });

    render(<ActivityList />);

    expect(screen.getByText('테스트 투표')).toBeInTheDocument();
    expect(screen.getByText('테스트 Q&A')).toBeInTheDocument();
    expect(screen.getByText('투표')).toBeInTheDocument();
    expect(screen.getByText('Q&A')).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 openEditModal 함수가 해당 인덱스와 함께 호출되어야 한다.', () => {
    vi.mocked(useActivityActionContext).mockReturnValue({
      polls: [{ title: '투표 1' }],
      qnas: [],
      actions: {
        addPoll: vi.fn(),
        editPoll: vi.fn(),
        deletePoll: mockDeletePoll,
        addQna: vi.fn(),
        editQna: vi.fn(),
        deleteQna: mockDeleteQna,
      },
    });

    render(<ActivityList />);

    const buttons = screen.getAllByRole('button');
    const editButton = buttons[0];
    fireEvent.click(editButton);

    expect(mockOpenEditPoll).toHaveBeenCalledWith(0);
  });

  it('삭제 버튼 클릭 시 deletePoll 함수가 해당 인덱스와 함께 호출되어야 한다.', () => {
    vi.mocked(useActivityActionContext).mockReturnValue({
      polls: [{ title: '투표 1' }],
      qnas: [],
      actions: {
        addPoll: vi.fn(),
        editPoll: vi.fn(),
        deletePoll: mockDeletePoll,
        addQna: vi.fn(),
        editQna: vi.fn(),
        deleteQna: mockDeleteQna,
      },
    });

    render(<ActivityList />);

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons[1];
    fireEvent.click(deleteButton);

    expect(mockDeletePoll).toHaveBeenCalledWith(0);
  });
});
