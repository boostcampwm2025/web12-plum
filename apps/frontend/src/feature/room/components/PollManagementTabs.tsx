import { Poll } from '@plum/shared-interfaces';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { PollModal } from '@/shared/components/PollModal';
import { Tabs, TabsList, TabContent, type TabItem, type TabValue } from './Tabs';
import { ScheduledCard } from './ScheduledCard';
import { TimeLeft } from './TimeLeft';
import { cn } from '@/shared/lib/utils';

const scheduledVotes: Poll[] = [
  {
    id: 'poll-1',
    roomId: 'room-1',
    status: 'pending',
    title: '오늘 저녁 메뉴로 가장 적절한 것은?',
    options: [
      { id: 1, value: '삼겹살에 된장찌개', count: 0 },
      { id: 2, value: '연어 포케', count: 0 },
    ],
    timeLimit: 180,
    createdAt: '2024-08-01T09:00:00.000Z',
    updatedAt: '2024-08-01T09:00:00.000Z',
  },
  {
    id: 'poll-2',
    roomId: 'room-1',
    status: 'pending',
    title: '다음 팀 회의 날짜는 언제가 좋을까요?',
    options: [
      { id: 1, value: '수요일 오후', count: 0 },
      { id: 2, value: '금요일 오전', count: 0 },
    ],
    timeLimit: 300,
    createdAt: '2024-08-01T10:00:00.000Z',
    updatedAt: '2024-08-01T10:00:00.000Z',
  },
];

const activeVote: Poll | null = {
  id: 'poll-3',
  roomId: 'room-1',
  status: 'active',
  title: '오늘 저녁 메뉴로 가장 적절한 것은?',
  options: [
    { id: 1, value: '삼겹살에 된장찌개', count: 12 },
    { id: 2, value: '연어 포케', count: 7 },
    { id: 3, value: '토마토 파스타', count: 10 },
  ],
  timeLimit: 300,
  createdAt: '2024-08-01T11:00:00.000Z',
  updatedAt: '2024-08-01T11:00:00.000Z',
};

const activeStartedAt = Date.now();

const completedVotes: Poll[] = [
  {
    id: 'poll-4',
    roomId: 'room-1',
    status: 'ended',
    title: '지난 회의 만족도는 어땠나요?',
    options: [
      { id: 1, value: '만족', count: 18 },
      { id: 2, value: '보통', count: 5 },
    ],
    timeLimit: 120,
    createdAt: '2024-08-01T08:00:00.000Z',
    updatedAt: '2024-08-01T08:30:00.000Z',
  },
];

const voteTabs: TabItem[] = [
  { value: 'scheduled', count: scheduledVotes.length },
  { value: 'active', count: activeVote ? 1 : 0 },
  { value: 'completed', count: completedVotes.length },
];

const completedVoteDetails: Record<
  string,
  {
    votersByOption: Record<number, string[]>;
  }
> = {
  'poll-4': {
    votersByOption: {
      1: ['윤자두', '이자두', '박자두'],
      2: ['김자두', '최자두'],
    },
  },
};

export function PollManagementTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('scheduled');

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
              {activeTab === 'scheduled' && <ScheduledVoteList />}
              {activeTab === 'active' && <ActiveVoteSection />}
              {activeTab === 'completed' && <CompletedVoteSection />}
            </motion.div>
          </AnimatePresence>
        </TabContent>
      </Tabs>
    </>
  );
}

function ScheduledVoteList() {
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {scheduledVotes.length === 0 && (
            <div className="text-subtext flex flex-1 items-center justify-center text-sm font-bold">
              예정된 투표가 없습니다.
            </div>
          )}
          {scheduledVotes.map((vote) => (
            <ScheduledCard
              key={vote.id}
              title={vote.title}
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
        onSubmit={() => undefined}
      />
    </>
  );
}

function ActiveVoteSection() {
  if (!activeVote) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        현재 진행중인 투표가 없습니다.
      </div>
    );
  }

  const totalVotes = activeVote.options.reduce((sum, option) => sum + option.count, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white">
          <span
            className="bg-success h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          <span>{totalVotes}명 답변중</span>
        </div>
        <div className="rounded-lg bg-gray-400 px-2 py-1.5">
          <TimeLeft
            timeLimitSeconds={activeVote.timeLimit}
            startedAt={activeStartedAt}
            className="w-auto justify-start text-xs text-white"
            iconSize={14}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-gray-400 p-4 text-white">
        <h3 className="text-lg font-semibold">{activeVote.title}</h3>
        <div className="flex flex-col gap-5">
          {activeVote.options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;

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
              </div>
            );
          })}
        </div>
      </div>

      <Button className="bg-error mt-auto w-full">종료하기</Button>
    </div>
  );
}

function CompletedVoteSection() {
  const [expandedOptionIds, setExpandedOptionIds] = useState<Set<number>>(new Set());

  if (completedVotes.length === 0) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        완료된 투표가 없습니다.
      </div>
    );
  }

  const [poll] = completedVotes;
  const totalVotes = poll.options.reduce((sum, option) => sum + option.count, 0);
  const votersByOption = completedVoteDetails[poll.id]?.votersByOption ?? {};

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl">
      <div className="flex flex-col overflow-y-auto rounded-xl bg-gray-400 p-4">
        <h3 className="text-lg font-bold">{poll.title}</h3>
        <span className="text-subtext mb-5 text-xs font-bold">총 투표 수: {totalVotes} 표</span>
        <div className="flex flex-col gap-4">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
            const isExpanded = expandedOptionIds.has(option.id);
            const voters = votersByOption[option.id] ?? [];
            return (
              <div
                key={option.id}
                className="flex flex-col gap-3"
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
                <button
                  type="button"
                  className="text-primary flex cursor-pointer items-center gap-2 text-sm"
                  onClick={() =>
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
                        {voters.map((name) => (
                          <div key={name}>{name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
