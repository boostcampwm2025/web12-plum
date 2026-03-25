import { useMemo } from 'react';

import { TimeLeft } from '@/shared/components/TimeLeft';
import { logger } from '@/shared/lib/logger';
import { cn } from '@/shared/lib/utils';
import { useToastStore } from '@/shared/stores/useToastStore';

import { PollService } from '../services/poll';
import { usePollStore } from '../stores/usePollStore';

const getStartedAt = (startedAt?: string) => {
  const parsed = startedAt ? Date.parse(startedAt) : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export function PollDialog() {
  const polls = usePollStore((state) => state.polls);
  const audienceVotedOptionByPollId = usePollStore((state) => state.audienceVotedOptionByPollId);
  const pollActions = usePollStore((state) => state.actions);
  const addToast = useToastStore((state) => state.actions.addToast);

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const selectedOptionId = activePoll ? (audienceVotedOptionByPollId[activePoll.id] ?? null) : null;
  const pollStartedAt = getStartedAt(activePoll?.startedAt);

  const totalVotes = activePoll?.options.reduce((sum, option) => sum + option.count, 0) ?? 0;
  const handleSelectOption = (pollId: string, optionId: number) => {
    pollActions.setAudienceVotedOption(pollId, optionId);
  };

  const handleVote = async (pollId: string, optionId: number) => {
    try {
      await PollService.vote({ pollId, optionId, isGesture: false });
    } catch (error) {
      logger.custom.error('[RoomDialogs] 투표 참여 실패', error);
      addToast({ type: 'error', title: '투표 참여에 실패했습니다.' });
    }
  };

  if (!activePoll) {
    return (
      <div className="text-subtext mb-2 flex justify-center">현재 진행중인 투표가 없습니다</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-text text-2xl font-bold">{activePoll.title}</h3>
      <ul className="space-y-3">
        {activePoll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
          const isSelected = selectedOptionId === option.id;
          const isDisabled = selectedOptionId !== null && !isSelected;

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  if (selectedOptionId === null && activePoll) {
                    handleSelectOption(activePoll.id, option.id);
                    handleVote(activePoll.id, option.id);
                  }
                }}
                disabled={selectedOptionId !== null}
                aria-pressed={isSelected}
                className={cn(
                  'text-text relative flex w-full overflow-hidden rounded-lg bg-gray-400',
                  isSelected && 'ring-primary/90 ring-2',
                  isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-r-lg transition-[width] duration-500 ease-out',
                    isSelected ? 'bg-primary/90' : 'bg-gray-200/80',
                  )}
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative z-5 flex w-full items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-extrabold',
                        isSelected ? 'bg-text/80 text-primary' : 'bg-primary/20 text-primary',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate">{option.value}</span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-bold',
                      isSelected ? 'text-text/80' : 'text-text/60',
                    )}
                  >
                    {option.count} ({percentage}%)
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="text-error flex w-full justify-center text-xs">
        선택 후에는 변경할 수 없습니다.
      </div>

      <TimeLeft
        timeLimitSeconds={activePoll.timeLimit}
        startedAt={pollStartedAt}
      />
    </div>
  );
}
