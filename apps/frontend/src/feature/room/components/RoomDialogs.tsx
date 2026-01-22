import { AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog as RoomDialog } from './Dialog';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { PollDialog } from './PollDialog';
import { usePollStore } from '../stores/usePollStore';
import { useSocketStore } from '@/store/useSocketStore';
import { logger } from '@/shared/lib/logger';

export function RoomDialogs() {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const setActiveDialog = useRoomUIStore((state) => state.setActiveDialog);
  const polls = usePollStore((state) => state.polls);
  const emit = useSocketStore((state) => state.actions.emit);
  const [selectedOptionByPollId, setSelectedOptionByPollId] = useState<
    Record<string, number | null>
  >({});

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const handleCloseDialog = () => setActiveDialog(activeDialog!);
  const parsedStartedAt = activePoll?.startedAt ? Date.parse(activePoll.startedAt) : NaN;
  const startedAt = Number.isNaN(parsedStartedAt) ? Date.now() : parsedStartedAt;
  const selectedOptionId = activePoll ? (selectedOptionByPollId[activePoll.id] ?? null) : null;

  const handleVote = (pollId: string, optionId: number) => {
    emit('vote', { pollId, optionId }, (response) => {
      if (!response.success) {
        logger.socket.warn('투표 참여 실패', response.error);
      }
    });
  };

  useEffect(() => {
    if (activePoll) return;
    setSelectedOptionByPollId({});
  }, [activePoll]);

  return (
    <AnimatePresence>
      {activeDialog === 'vote' && (
        <RoomDialog
          title="투표"
          onClose={handleCloseDialog}
        >
          <PollDialog
            poll={activePoll}
            startedAt={startedAt}
            onVote={handleVote}
            selectedOptionId={selectedOptionId}
            onSelectOption={(pollId, optionId) =>
              setSelectedOptionByPollId((state) => ({
                ...state,
                [pollId]: optionId,
              }))
            }
          />
        </RoomDialog>
      )}
      {activeDialog === 'qna' && (
        <RoomDialog
          title="Q&A"
          onClose={handleCloseDialog}
        >
          <div>Q&A 내용</div>
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
