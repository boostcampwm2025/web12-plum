import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { PollModal } from '@/shared/components/PollModal';
import { Tabs, TabsList, TabContent, type TabItem, type TabValue } from './Tabs';
import { ScheduledCard } from './ScheduledCard';
import { TimeLeft } from './TimeLeft';
import { cn } from '@/shared/lib/utils';
import { useSocketStore } from '@/store/useSocketStore';
import { usePollStore } from '../stores/usePollStore';
import { logger } from '@/shared/lib/logger';
import type { PollFormValues } from '@/shared/constants/poll';
import type { Poll, Voter } from '@plum/shared-interfaces';

export function PollManagementTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('scheduled');
  const polls = usePollStore((state) => state.polls);
  const pollActions = usePollStore((state) => state.actions);
  const emit = useSocketStore((state) => state.actions.emit);

  const scheduledPolls = useMemo(() => polls.filter((poll) => poll.status === 'pending'), [polls]);
  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const completedPolls = useMemo(() => polls.filter((poll) => poll.status === 'ended'), [polls]);

  const voteTabs: TabItem[] = useMemo(
    () => [
      { value: 'scheduled', count: scheduledPolls.length },
      { value: 'active', count: activePoll ? 1 : 0 },
      { value: 'completed', count: completedPolls.length },
    ],
    [scheduledPolls.length, activePoll, completedPolls.length],
  );

  const fetchPolls = useCallback(() => {
    emit('get_poll', (response) => {
      if (!response.success) {
        logger.socket.warn('투표 목록 조회 실패', response.error);
        return;
      }
      pollActions.hydrateFromPolls(response.polls);
    });
  }, [emit, pollActions]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const handleCreatePoll = useCallback(
    (data: PollFormValues) => {
      emit('create_poll', data, (response) => {
        if (!response.success) {
          logger.socket.warn('투표 생성 실패', response.error);
          return;
        }
        fetchPolls();
      });
    },
    [emit, fetchPolls],
  );

  const handleStartPoll = useCallback(
    (pollId: string) => {
      emit('emit_poll', { pollId }, (response) => {
        if (!response.success) {
          logger.socket.warn('투표 시작 실패', response.error);
          return;
        }
        fetchPolls();
      });
    },
    [emit, fetchPolls],
  );

  const handleBreakPoll = useCallback(() => {
    if (!activePoll) return;
    emit('break_poll', { pollId: activePoll.id }, (response) => {
      if (!response.success) {
        logger.socket.warn('투표 종료 실패', response.error);
        return;
      }
      pollActions.setCompletedFromEndDetail({ pollId: activePoll.id, options: response.options });
      fetchPolls();
    });
  }, [emit, activePoll, pollActions, fetchPolls]);

  return (
    <>
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
      >
        <TabsList tabs={voteTabs} />
        <TabContent value={activeTab}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {activeTab === 'scheduled' && (
                <ScheduledVoteList
                  scheduledPolls={scheduledPolls}
                  onCreatePoll={handleCreatePoll}
                  onStartPoll={handleStartPoll}
                  isStartDisabled={Boolean(activePoll)}
                />
              )}
              {activeTab === 'active' && (
                <ActiveVoteSection
                  poll={activePoll}
                  onBreakPoll={handleBreakPoll}
                />
              )}
              {activeTab === 'completed' && <CompletedVoteSection polls={completedPolls} />}
            </motion.div>
          </AnimatePresence>
        </TabContent>
      </Tabs>
    </>
  );
}

interface VoterExpandableSectionProps {
  voters: Voter[];
  isExpanded: boolean;
  onToggle: () => void;
}

function VoterExpandableSection({ voters, isExpanded, onToggle }: VoterExpandableSectionProps) {
  return (
    <>
      <button
        type="button"
        className="text-primary flex cursor-pointer items-center gap-2 text-sm"
        onClick={onToggle}
      >
        투표자 보기
        <Icon
          name="chevron"
          size={16}
          className={cn(
            'transition-transform duration-200 ease-in-out',
            isExpanded ? 'rotate-180' : 'rotate-0',
          )}
          decorative
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          paddingTop: isExpanded ? '0.75rem' : '0rem',
          paddingBottom: isExpanded ? '0.75rem' : '0rem',
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="grid overflow-hidden rounded-lg bg-gray-500 px-4 text-sm text-white"
      >
        <div className="max-h-26 min-h-0 overflow-y-auto">
          {voters.length === 0 ? (
            <div className="text-subtext">투표자가 없습니다.</div>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {voters.map((voter) => (
                <div key={voter.id}>{voter.name}</div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

interface ScheduledVoteListProps {
  scheduledPolls: {
    id: string;
    title: string;
  }[];
  onCreatePoll: (data: PollFormValues) => void;
  onStartPoll: (pollId: string) => void;
  isStartDisabled: boolean;
}

function ScheduledVoteList({
  scheduledPolls,
  onCreatePoll,
  onStartPoll,
  isStartDisabled,
}: ScheduledVoteListProps) {
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {scheduledPolls.length === 0 && (
            <div className="text-subtext flex flex-1 items-center justify-center text-sm font-bold">
              예정된 투표가 없습니다.
            </div>
          )}
          {scheduledPolls.map((vote) => (
            <ScheduledCard
              key={vote.id}
              title={vote.title}
              onEdit={() => {
                /*TODO: 투표 수정 추가*/
              }}
              onStart={() => onStartPoll(vote.id)}
              isStartDisabled={isStartDisabled}
            />
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => setIsPollModalOpen(true)}
        >
          <Icon
            name="plus"
            size={16}
            decorative
          />
          새로운 투표 추가
        </Button>
      </div>
      <PollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSubmit={onCreatePoll}
      />
    </>
  );
}

interface ActiveVoteSectionProps {
  poll: Poll | undefined;
  onBreakPoll: () => void;
}

function ActiveVoteSection({ poll, onBreakPoll }: ActiveVoteSectionProps) {
  const [expandedOptionIds, setExpandedOptionIds] = useState<Set<number>>(new Set());

  if (!poll) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        현재 진행중인 투표가 없습니다.
      </div>
    );
  }

  const totalVotes = poll.options.reduce((sum, option) => sum + option.count, 0);
  const parsedStartedAt = poll.startedAt ? Date.parse(poll.startedAt) : NaN;
  const startedAt = Number.isNaN(parsedStartedAt) ? Date.now() : parsedStartedAt;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-text flex items-center gap-2 text-xs">
          <span
            className="bg-success h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          <span>{totalVotes}명 답변중</span>
        </div>
        <div className="rounded-lg bg-gray-400 px-2 py-1.5">
          <TimeLeft
            timeLimitSeconds={poll.timeLimit}
            startedAt={startedAt}
            className="w-auto justify-start text-xs text-white"
            iconSize={14}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-gray-400 p-4 text-white">
        <h3 className="text-lg font-semibold">{poll.title}</h3>
        <div className="flex flex-col gap-5">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;

            return (
              <div
                key={option.id}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>{option.value}</span>
                  <span className="text-text/80">
                    {percentage}% ({option.count}명)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-500">
                  <div
                    className="bg-primary/90 h-full rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <VoterExpandableSection
                  voters={option.voters ?? []}
                  isExpanded={expandedOptionIds.has(option.id)}
                  onToggle={() =>
                    setExpandedOptionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(option.id)) {
                        next.delete(option.id);
                      } else {
                        next.add(option.id);
                      }
                      return next;
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <Button
        className="bg-error mt-auto w-full"
        onClick={onBreakPoll}
      >
        종료하기
      </Button>
    </div>
  );
}

interface CompletedVoteSectionProps {
  polls: Poll[];
}

function CompletedVoteSection({ polls }: CompletedVoteSectionProps) {
  const [expandedOptionKeys, setExpandedOptionKeys] = useState<Set<string>>(new Set());

  if (polls.length === 0) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        완료된 투표가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl">
      <div className="flex flex-col gap-4 overflow-y-auto">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, option) => sum + option.count, 0);

          return (
            <div
              key={poll.id}
              className="flex flex-col rounded-xl bg-gray-400 p-4"
            >
              <h3 className="text-lg font-bold">{poll.title}</h3>
              <span className="text-subtext mb-5 text-xs font-bold">
                총 투표 수: {totalVotes} 표
              </span>
              <div className="flex flex-col gap-4">
                {poll.options.map((option) => {
                  const percentage =
                    totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
                  const optionKey = `${poll.id}:${option.id}`;

                  return (
                    <div
                      key={option.id}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span>{option.value}</span>
                        <span className="text-white/80">
                          {percentage}% ({option.count}명)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-gray-500">
                        <div
                          className="bg-primary/90 h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <VoterExpandableSection
                        voters={option.voters ?? []}
                        isExpanded={expandedOptionKeys.has(optionKey)}
                        onToggle={() =>
                          setExpandedOptionKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(optionKey)) {
                              next.delete(optionKey);
                            } else {
                              next.add(optionKey);
                            }
                            return next;
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
