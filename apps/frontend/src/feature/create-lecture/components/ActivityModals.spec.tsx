import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityModals } from './ActivityModals';
import { useActivityActionContext } from '../hooks/useActivityActionContext';
import { useActivityModalContext } from '../hooks/useActivityModalContext';
import { PollModal } from '../../../shared/components/PollModal';
import { QnAModal } from '../../../shared/components/QnAModal';
import '@testing-library/jest-dom';

vi.mock('../hooks/useActivityActionContext');
vi.mock('../hooks/useActivityModalContext');
vi.mock('../../../shared/components/PollModal', () => ({
  PollModal: vi.fn(() => null),
}));
vi.mock('../../../shared/components/QnAModal', () => ({
  QnAModal: vi.fn(() => null),
}));

describe('ActivityModals 테스트', () => {
  const mockCloseModal = vi.fn();
  const mockAddPoll = vi.fn();
  const mockEditPoll = vi.fn();
  const mockAddQna = vi.fn();
  const mockEditQna = vi.fn();

  const mockPolls = [{ title: '투표 1', options: ['옵션1', '옵션2'] }];
  const mockQnas = [{ title: 'Q&A 1', description: '설명' }];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useActivityActionContext).mockReturnValue({
      polls: mockPolls,
      qnas: mockQnas,
      actions: {
        addPoll: mockAddPoll,
        editPoll: mockEditPoll,
        deletePoll: vi.fn(),
        addQna: mockAddQna,
        editQna: mockEditQna,
        deleteQna: vi.fn(),
      },
    });
  });

  it('투표 생성 모달이 올바르게 렌더링되어야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'create-poll' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    expect(PollModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: false,
        isOpen: true,
        initialData: undefined,
        onClose: mockCloseModal,
      }),
      expect.anything(),
    );
  });

  it('투표 수정 모달이 올바르게 렌더링되어야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'edit-poll', index: 0 },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    expect(PollModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: true,
        isOpen: true,
        initialData: mockPolls[0],
        onClose: mockCloseModal,
      }),
      expect.anything(),
    );
  });

  it('Q&A 생성 모달이 올바르게 렌더링되어야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'create-qna' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    expect(QnAModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: false,
        isOpen: true,
        initialData: undefined,
        onClose: mockCloseModal,
      }),
      expect.anything(),
    );
  });

  it('Q&A 수정 모달이 올바르게 렌더링되어야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'edit-qna', index: 0 },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    expect(QnAModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: true,
        isOpen: true,
        initialData: mockQnas[0],
        onClose: mockCloseModal,
      }),
      expect.anything(),
    );
  });

  it('모달이 닫혀있을 때 isOpen이 false여야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'none' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    expect(PollModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false }),
      expect.anything(),
    );
    expect(QnAModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false }),
      expect.anything(),
    );
  });

  it('투표 생성 시 addPoll이 호출되고 모달이 닫혀야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'create-poll' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    const mockedPollModal = vi.mocked(PollModal);
    const onSubmit = mockedPollModal.mock.calls[0][0].onSubmit;
    const testData = { title: '새 투표', options: ['A', 'B'] };

    onSubmit(testData);

    expect(mockAddPoll).toHaveBeenCalledWith(testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('투표 수정 시 editPoll이 호출되고 모달이 닫혀야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'edit-poll', index: 0 },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    const mockedPollModal = vi.mocked(PollModal);
    const onSubmit = mockedPollModal.mock.calls[0][0].onSubmit;
    const testData = { title: '수정된 투표', options: ['A', 'B'] };

    onSubmit(testData);

    expect(mockEditPoll).toHaveBeenCalledWith(0, testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('Q&A 생성 시 addQna가 호출되고 모달이 닫혀야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'create-qna' },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    const mockedQnAModal = vi.mocked(QnAModal);
    const onSubmit = mockedQnAModal.mock.calls[0][0].onSubmit;
    const testData = { title: '새 Q&A', description: '설명' };

    onSubmit(testData);

    expect(mockAddQna).toHaveBeenCalledWith(testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('Q&A 수정 시 editQna가 호출되고 모달이 닫혀야 한다.', () => {
    vi.mocked(useActivityModalContext).mockReturnValue({
      modalState: { type: 'edit-qna', index: 0 },
      openCreatePollModal: vi.fn(),
      openCreateQnaModal: vi.fn(),
      openEditPollModal: vi.fn(),
      openEditQnaModal: vi.fn(),
      closeModal: mockCloseModal,
    });

    render(<ActivityModals />);

    const mockedQnAModal = vi.mocked(QnAModal);
    const onSubmit = mockedQnAModal.mock.calls[0][0].onSubmit;
    const testData = { title: '수정된 Q&A', description: '새 설명' };

    onSubmit(testData);

    expect(mockEditQna).toHaveBeenCalledWith(0, testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });
});
