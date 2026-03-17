import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PollModal } from '../../../shared/components/PollModal';
import { QnAModal } from '../../../shared/components/QnAModal';
import { PollFormValues } from '../../../shared/constants/poll';
import { QnAFormValues } from '../../../shared/constants/qna';
import { useActivityDataStore } from '../stores/useActivityDataStore';
import { useActivityModalStore } from '../stores/useActivityModalStore';
import { ActivityModals } from './ActivityModals';

import '@testing-library/jest-dom';

vi.mock('../stores/useActivityDataStore');
vi.mock('../stores/useActivityModalStore');
vi.mock('@/shared/components/PollModal', () => ({
  PollModal: vi.fn(() => null),
}));
vi.mock('@/shared/components/QnAModal', () => ({
  QnAModal: vi.fn(() => null),
}));

const mockCloseModal = vi.fn();
const mockAppendPoll = vi.fn();
const mockUpdatePoll = vi.fn();
const mockRemovePoll = vi.fn();
const mockAppendQna = vi.fn();
const mockUpdateQna = vi.fn();
const mockRemoveQna = vi.fn();
const mockReset = vi.fn();

const mockPolls = [
  { id: 'poll-1', title: '투표 1', options: [{ value: 'A' }, { value: 'B' }], timeLimit: 0 },
];
const mockQnas = [{ id: 'qna-1', title: 'Q&A 1', timeLimit: 0, isPublic: false }];

describe('ActivityModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useActivityDataStore).mockImplementation((selector) => {
      const state = {
        polls: mockPolls,
        qnas: mockQnas,
        actions: {
          appendPoll: mockAppendPoll,
          updatePoll: mockUpdatePoll,
          removePoll: mockRemovePoll,
          appendQna: mockAppendQna,
          updateQna: mockUpdateQna,
          removeQna: mockRemoveQna,
          reset: mockReset,
        },
      };
      return selector(state);
    });
  });

  it('모달 상태가 none일 때 PollModal과 QnAModal이 닫힌 상태로 렌더링된다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'none' as const },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
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

  it('투표 생성 모달이 열리면 isEditMode가 false이고 initialData가 undefined이다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'create-poll' as const },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
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

  it('투표 수정 모달이 열리면 해당 ID의 투표 데이터를 initialData로 전달한다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'edit-poll' as const, id: 'poll-1' },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
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

  it('Q&A 생성 모달이 열리면 isEditMode가 false이고 initialData가 undefined이다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'create-qna' as const },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
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

  it('Q&A 수정 모달이 열리면 해당 ID의 Q&A 데이터를 initialData로 전달한다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'edit-qna' as const, id: 'qna-1' },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
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

  it('투표 생성 모달에서 제출하면 appendPoll이 호출되고 모달이 닫힌다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'create-poll' as const },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
    });

    render(<ActivityModals />);
    const pollSubmit = vi.mocked(PollModal).mock.calls[0][0].onSubmit as (
      data: PollFormValues,
    ) => void;
    const testData: PollFormValues = {
      title: '테스트 투표',
      options: [{ value: 'A' }, { value: 'B' }],
      timeLimit: 0,
    };

    pollSubmit(testData);

    expect(mockAppendPoll).toHaveBeenCalledWith(testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('투표 수정 모달에서 제출하면 updatePoll이 ID와 함께 호출되고 모달이 닫힌다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'edit-poll' as const, id: 'poll-1' },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
    });

    render(<ActivityModals />);
    const pollSubmit = vi.mocked(PollModal).mock.calls[0][0].onSubmit as (
      data: PollFormValues,
    ) => void;
    const testData: PollFormValues = {
      title: '수정 투표',
      options: [{ value: 'X' }, { value: 'Y' }],
      timeLimit: 0,
    };

    pollSubmit(testData);

    expect(mockUpdatePoll).toHaveBeenCalledWith('poll-1', testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('Q&A 생성 모달에서 제출하면 appendQna가 호출되고 모달이 닫힌다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'create-qna' as const },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
    });

    render(<ActivityModals />);
    const qnaSubmit = vi.mocked(QnAModal).mock.calls[0][0].onSubmit as (
      data: QnAFormValues,
    ) => void;
    const testData: QnAFormValues = { title: '테스트 Q&A', timeLimit: 0, isPublic: false };

    qnaSubmit(testData);

    expect(mockAppendQna).toHaveBeenCalledWith(testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('Q&A 수정 모달에서 제출하면 updateQna가 ID와 함께 호출되고 모달이 닫힌다', () => {
    vi.mocked(useActivityModalStore).mockImplementation((selector) => {
      const state = {
        modalState: { type: 'edit-qna' as const, id: 'qna-1' },
        actions: { close: mockCloseModal, open: vi.fn() },
      };
      return selector(state);
    });

    render(<ActivityModals />);
    const qnaSubmit = vi.mocked(QnAModal).mock.calls[0][0].onSubmit as (
      data: QnAFormValues,
    ) => void;
    const testData: QnAFormValues = { title: '수정 Q&A', timeLimit: 30, isPublic: true };

    qnaSubmit(testData);

    expect(mockUpdateQna).toHaveBeenCalledWith('qna-1', testData);
    expect(mockCloseModal).toHaveBeenCalled();
  });
});
