import { AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog as RoomDialog } from './Dialog';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { PollDialog } from './PollDialog';
import { QnaDialog } from './QnaDialog';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { useSocketStore } from '@/store/useSocketStore';
import { logger } from '@/shared/lib/logger';
import { useToastStore } from '@/store/useToastStore';

export function RoomDialogs() {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const setActiveDialog = useRoomUIStore((state) => state.setActiveDialog);
  const polls = usePollStore((state) => state.polls);
  const audienceVotedOptionByPollId = usePollStore((state) => state.audienceVotedOptionByPollId);
  const pollActions = usePollStore((state) => state.actions);
  const qnas = useQnaStore((state) => state.qnas);
  const emit = useSocketStore((state) => state.actions.emit);
  const addToast = useToastStore((state) => state.actions.addToast);
  const [submittedQnaById, setSubmittedQnaById] = useState<Record<string, boolean>>({});

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const activeQna = useMemo(() => qnas.find((qna) => qna.status === 'active'), [qnas]);
  const handleCloseDialog = () => setActiveDialog(activeDialog!);
  const pollStartedAt = getStartedAt(activePoll?.startedAt);
  const qnaStartedAt = getStartedAt(activeQna?.startedAt);
  const selectedOptionId = activePoll ? (audienceVotedOptionByPollId[activePoll.id] ?? null) : null;

  const handleVote = (pollId: string, optionId: number) => {
    emit('vote', { pollId, optionId }, (response) => {
      if (!response.success) {
        logger.socket.warn('투표 참여 실패', response.error);
      }
    });
  };

  const handleAnswer = (qnaId: string, text: string) => {
    emit('answer', { qnaId, text }, (response) => {
      if (!response.success) {
        logger.socket.warn('QnA 답변 실패', response.error);
        addToast({
          type: 'error',
          title: 'Q&A 답변에 실패했습니다.',
        });
        return;
      }
      setSubmittedQnaById((state) => ({ ...state, [qnaId]: true }));
    });
  };

  useEffect(() => {
    if (activeQna) return;
    setSubmittedQnaById({});
  }, [activeQna]);

  return (
    <AnimatePresence>
      {activeDialog === 'vote' && (
        <RoomDialog
          title="투표"
          onClose={handleCloseDialog}
        >
          <PollDialog
            poll={activePoll}
            startedAt={pollStartedAt}
            onVote={handleVote}
            selectedOptionId={selectedOptionId}
            onSelectOption={(pollId, optionId) =>
              pollActions.setAudienceVotedOption(pollId, optionId)
            }
          />
        </RoomDialog>
      )}
      {activeDialog === 'qna' && (
        <RoomDialog
          title="Q&A"
          onClose={handleCloseDialog}
        >
          <QnaDialog
            qna={activeQna}
            startedAt={qnaStartedAt}
            onSubmit={handleAnswer}
            isSubmitted={activeQna ? (submittedQnaById[activeQna.id] ?? false) : false}
          />
        </RoomDialog>
      )}
      {activeDialog === 'ranking' && (
        <RoomDialog
          title="랭킹"
          onClose={handleCloseDialog}
        >
          <div>랭킹 내용</div>
        </RoomDialog>
      )}
    </AnimatePresence>
  );
}

const getStartedAt = (startedAt?: string) => {
  const parsed = startedAt ? Date.parse(startedAt) : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};
