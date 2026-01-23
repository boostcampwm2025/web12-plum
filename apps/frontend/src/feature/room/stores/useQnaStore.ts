import { create } from 'zustand';
import type {
  Answer,
  EndQnaDetailPayload,
  Qna,
  QnaPayload,
  UpdateQnaFullPayload,
  UpdateQnaSubPayload,
} from '@plum/shared-interfaces';

interface QnaState {
  qnas: Qna[];
  actions: {
    hydrateFromQnas: (qnas: Qna[]) => void;
    setActiveQna: (qna: QnaPayload) => void;
    clearActiveQna: (qnaId: string) => void;
    updateQnaSub: (data: UpdateQnaSubPayload) => void;
    updateQnaDetail: (data: UpdateQnaFullPayload) => void;
    setCompletedFromEndDetail: (data: EndQnaDetailPayload) => void;
  };
}

const ensureAnswers = (answers: Answer[] | undefined) => answers ?? [];

export const useQnaStore = create<QnaState>((set) => ({
  qnas: [],
  actions: {
    hydrateFromQnas: (qnas) => {
      set({
        qnas: qnas.map((qna) => ({
          ...qna,
          answers: ensureAnswers(qna.answers),
        })),
      });
    },
    setActiveQna: (qna) => {
      set((state) => ({
        qnas: state.qnas.some((item) => item.id === qna.id)
          ? state.qnas.map((item) =>
              item.id === qna.id
                ? {
                    ...item,
                    status: 'active',
                    title: qna.title,
                    timeLimit: qna.timeLimit,
                    startedAt: qna.startedAt,
                    endedAt: qna.endedAt,
                  }
                : item,
            )
          : [
              ...state.qnas,
              {
                id: qna.id,
                roomId: '',
                status: 'active',
                title: qna.title,
                timeLimit: qna.timeLimit,
                isPublic: true,
                createdAt: '',
                updatedAt: '',
                startedAt: qna.startedAt,
                endedAt: qna.endedAt,
                answers: [],
              },
            ],
      }));
    },
    clearActiveQna: (qnaId) => {
      set((state) => ({
        qnas: state.qnas.map((item) => (item.id === qnaId ? { ...item, status: 'ended' } : item)),
      }));
    },
    updateQnaSub: (data) => {
      const text = data.text;
      if (!text) return;
      set((state) => ({
        qnas: state.qnas.map((item) =>
          item.id === data.qnaId
            ? {
                ...item,
                answers: [
                  ...ensureAnswers(item.answers),
                  { participantId: '', participantName: '익명', text },
                ],
              }
            : item,
        ),
      }));
    },
    updateQnaDetail: (data) => {
      set((state) => ({
        qnas: state.qnas.map((item) =>
          item.id === data.qnaId
            ? {
                ...item,
                answers: [
                  ...ensureAnswers(item.answers),
                  {
                    participantId: data.participantId,
                    participantName: data.participantName,
                    text: data.text,
                  },
                ],
              }
            : item,
        ),
      }));
    },
    setCompletedFromEndDetail: (data) => {
      set((state) => ({
        qnas: state.qnas.map((item) =>
          item.id === data.qnaId
            ? {
                ...item,
                status: 'ended',
                answers: ensureAnswers(data.answers),
              }
            : item,
        ),
      }));
    },
  },
}));
