import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { Dialog as RoomDialog } from './Dialog';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { PollDialog } from './PollDialog';
import { QnaDialog } from './QnaDialog';
import { RankingDialog } from './RankingDialog';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { logger } from '@/shared/lib/logger';
import { useToastStore } from '@/store/useToastStore';
import { SocketClient } from '@/shared/socket/socket';

export function RoomDialogs() {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const setActiveDialog = useRoomUIStore((state) => state.setActiveDialog);
  const polls = usePollStore((state) => state.polls);
  const audienceVotedOptionByPollId = usePollStore((state) => state.audienceVotedOptionByPollId);
  const pollActions = usePollStore((state) => state.actions);
  const qnas = useQnaStore((state) => state.qnas);
  const answeredByQnaId = useQnaStore((state) => state.answeredByQnaId);
  const qnaActions = useQnaStore((state) => state.actions);
  const addToast = useToastStore((state) => state.actions.addToast);

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const activeQna = useMemo(() => qnas.find((qna) => qna.status === 'active'), [qnas]);
  const handleCloseDialog = () => setActiveDialog(activeDialog!);
  const pollStartedAt = getStartedAt(activePoll?.startedAt);
  const qnaStartedAt = getStartedAt(activeQna?.startedAt);
  const selectedOptionId = activePoll ? (audienceVotedOptionByPollId[activePoll.id] ?? null) : null;

  const handleVote = async (pollId: string, optionId: number) => {
    try {
      await SocketClient.emitWithAck('vote', { pollId, optionId, isGesture: false });
    } catch (error) {
      logger.custom.error('[RoomDialogs] 투표 참여 실패', error);
      addToast({ type: 'error', title: '투표 참여에 실패했습니다.' });
    }
  };

  const handleAnswer = async (qnaId: string, text: string) => {
    try {
      await SocketClient.emitWithAck('answer', { qnaId, text });
      qnaActions.setAnswered(qnaId, true);
    } catch (error) {
      logger.custom.error('[RoomDialogs] Q&A 답변 실패', error);
      addToast({ type: 'error', title: 'Q&A 답변에 실패했습니다.' });
    }
  };

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
            isSubmitted={activeQna ? (answeredByQnaId[activeQna.id] ?? false) : false}
          />
        </RoomDialog>
      )}
      {activeDialog === 'ranking' && (
        <RoomDialog
          title="참여도 순위"
          onClose={handleCloseDialog}
        >
          <RankingDialog />
        </RoomDialog>
      )}
    </AnimatePresence>
  );
}

const getStartedAt = (startedAt?: string) => {
  const parsed = startedAt ? Date.parse(startedAt) : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};
