import { Qna } from '@plum/shared-interfaces';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { QnAModal } from '@/shared/components/QnAModal';
import { Tabs, TabsList, TabContent, type TabItem, type TabValue } from './Tabs';
import { ScheduledCard } from './ScheduledCard';
import { TimeLeft } from './TimeLeft';
import { cn } from '@/shared/lib/utils';

interface QnaResponse {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
}

const scheduledQnas: Qna[] = [
  {
    id: 'qna-1',
    roomId: 'room-1',
    status: 'pending',
    title: '오늘 저녁 메뉴로 가장 적절한 것은?',
    timeLimit: 180,
    isPublic: true,
    createdAt: '2024-08-01T09:00:00.000Z',
    updatedAt: '2024-08-01T09:00:00.000Z',
  },
  {
    id: 'qna-2',
    roomId: 'room-1',
    status: 'pending',
    title: '다음 팀 회의 날짜는 언제가 좋을까요?',
    timeLimit: 300,
    isPublic: false,
    createdAt: '2024-08-01T10:00:00.000Z',
    updatedAt: '2024-08-01T10:00:00.000Z',
  },
];

const activeQna: Qna | null = {
  id: 'qna-3',
  roomId: 'room-1',
  status: 'active',
  title: '오늘 저녁 메뉴로 가장 적절한 것은?',
  timeLimit: 300,
  isPublic: true,
  createdAt: '2024-08-01T11:00:00.000Z',
  updatedAt: '2024-08-01T11:00:00.000Z',
};

const activeQnaResponses: QnaResponse[] = [
  {
    id: 'resp-1',
    userName: '윤자두',
    content:
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    createdAt: '2024-08-01T11:05:00.000Z',
  },
  {
    id: 'resp-2',
    userName: '이자두',
    content:
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    createdAt: '2024-08-01T11:06:00.000Z',
  },
  {
    id: 'resp-3',
    userName: '김자두',
    content:
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    createdAt: '2024-08-01T11:07:00.000Z',
  },
  {
    id: 'resp-4',
    userName: '박자두',
    content:
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    createdAt: '2024-08-01T11:08:00.000Z',
  },
];

const activeStartedAt = Date.now();

const completedQnas: Qna[] = [
  {
    id: 'qna-4',
    roomId: 'room-1',
    status: 'ended',
    title: '오늘 저녁 메뉴로 가장 적절한 것은?',
    timeLimit: 180,
    isPublic: true,
    createdAt: '2024-08-01T08:00:00.000Z',
    updatedAt: '2024-08-01T08:30:00.000Z',
  },
  {
    id: 'qna-5',
    roomId: 'room-1',
    status: 'ended',
    title: '가장 적절한 WebRTC 방식은?',
    timeLimit: 300,
    isPublic: false,
    createdAt: '2024-08-01T07:00:00.000Z',
    updatedAt: '2024-08-01T07:30:00.000Z',
  },
];

const completedQnaDetails: Record<string, QnaResponse[]> = {
  'qna-4': [
    {
      id: 'resp-5',
      userName: '윤자두',
      content:
        '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
      createdAt: '2024-08-01T08:05:00.000Z',
    },
    {
      id: 'resp-6',
      userName: '이자두',
      content:
        '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
      createdAt: '2024-08-01T08:10:00.000Z',
    },
    {
      id: 'resp-7',
      userName: '김자두',
      content:
        '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 일생에 이는 바람에도 나는 괴로워했다.',
      createdAt: '2024-08-01T08:15:00.000Z',
    },
    {
      id: 'resp-8',
      userName: '박자두',
      content:
        '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 일생에 이는 바람에도 나는 괴로워했다.',
      createdAt: '2024-08-01T08:20:00.000Z',
    },
  ],
  'qna-5': [
    {
      id: 'resp-9',
      userName: '윤자두',
      content: 'Mesh',
      createdAt: '2024-08-01T07:05:00.000Z',
    },
    {
      id: 'resp-10',
      userName: '김자두',
      content: 'MCU',
      createdAt: '2024-08-01T07:10:00.000Z',
    },
    {
      id: 'resp-11',
      userName: '박자두',
      content: 'SFU',
      createdAt: '2024-08-01T07:15:00.000Z',
    },
  ],
};

const qnaTabs: TabItem[] = [
  { value: 'scheduled', count: scheduledQnas.length },
  { value: 'active', count: activeQna ? 1 : 0 },
  { value: 'completed', count: completedQnas.length },
];

export function QnaManagementTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('scheduled');

  return (
    <>
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
      >
        <TabsList tabs={qnaTabs} />
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
              {activeTab === 'scheduled' && <ScheduledQnaList />}
              {activeTab === 'active' && <ActiveQnaSection />}
              {activeTab === 'completed' && <CompletedQnaSection />}
            </motion.div>
          </AnimatePresence>
        </TabContent>
      </Tabs>
    </>
  );
}

function ScheduledQnaList() {
  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {scheduledQnas.length === 0 && (
            <div className="text-subtext flex flex-1 items-center justify-center text-sm font-bold">
              예정된 Q&A가 없습니다.
            </div>
          )}
          {scheduledQnas.map((qna) => (
            <ScheduledCard
              key={qna.id}
              title={qna.title}
            />
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => setIsQnaModalOpen(true)}
        >
          <Icon
            name="plus"
            size={16}
            decorative
          />
          새로운 Q&A 추가
        </Button>
      </div>
      <QnAModal
        isOpen={isQnaModalOpen}
        onClose={() => setIsQnaModalOpen(false)}
        onSubmit={() => undefined}
      />
    </>
  );
}

function ActiveQnaSection() {
  if (!activeQna) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        현재 진행중인 Q&A가 없습니다.
      </div>
    );
  }

  const totalResponses = activeQnaResponses.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-text flex items-center gap-2 text-xs">
          <span
            className="bg-success h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          <span>{totalResponses}명 답변중</span>
        </div>
        <div className="rounded-lg bg-gray-400 px-2 py-1.5">
          <TimeLeft
            timeLimitSeconds={activeQna.timeLimit}
            startedAt={activeStartedAt}
            className="text-text w-auto justify-start text-xs"
            iconSize={14}
          />
        </div>
      </div>

      <div className="text-text flex min-h-0 flex-col gap-4 rounded-xl bg-gray-400 p-4">
        <h3 className="text-lg font-bold">{activeQna.title}</h3>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {activeQnaResponses.map((response) => (
            <div
              key={response.id}
              className="flex gap-2 text-sm"
            >
              <span className="text-primary shrink-0 font-bold">{response.userName}</span>
              <p className="text-text">{response.content}</p>
            </div>
          ))}
        </div>
      </div>

      <Button className="bg-error mt-auto w-full">종료하기</Button>
    </div>
  );
}

function CompletedQnaSection() {
  const [expandedQnaIds, setExpandedQnaIds] = useState<Set<string>>(new Set());

  if (completedQnas.length === 0) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        완료된 Q&A가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {completedQnas.map((qna) => {
        const isExpanded = expandedQnaIds.has(qna.id);
        const responses = completedQnaDetails[qna.id] ?? [];
        const totalResponses = responses.length;

        return (
          <div
            key={qna.id}
            className="flex flex-col rounded-xl bg-gray-400 p-4"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between text-left"
              onClick={() =>
                setExpandedQnaIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(qna.id)) {
                    next.delete(qna.id);
                  } else {
                    next.add(qna.id);
                  }
                  return next;
                })
              }
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-bold">{qna.title}</h3>
                <span className="text-subtext text-xs font-bold">
                  총 답변 수 {totalResponses}개
                </span>
              </div>
              <Icon
                name="chevron"
                size={20}
                className={cn(
                  'text-text transition-transform duration-200 ease-in-out',
                  isExpanded ? 'rotate-180' : 'rotate-0',
                )}
                decorative
              />
            </button>
            <motion.div
              initial={false}
              animate={{
                gridTemplateRows: isExpanded ? '1fr' : '0fr',
                marginTop: isExpanded ? '1rem' : '0rem',
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="grid overflow-hidden"
            >
              <div className="max-h-88 min-h-0 overflow-y-auto">
                {responses.length === 0 ? (
                  <div className="text-subtext text-sm">답변이 없습니다.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className="flex gap-2 text-sm"
                      >
                        <span className="text-primary shrink-0 font-bold">{response.userName}</span>
                        <p className="text-text">{response.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
