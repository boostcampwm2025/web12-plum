import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { QnAModal } from '@/shared/components/QnAModal';
import { Tabs, TabsList, TabContent, type TabItem, type TabValue } from './Tabs';
import { ScheduledCard } from './ScheduledCard';
import { TimeLeft } from './TimeLeft';
import { cn } from '@/shared/lib/utils';
import { useSocketStore } from '@/store/useSocketStore';
import { useQnaStore } from '../stores/useQnaStore';
import { logger } from '@/shared/lib/logger';
import type { QnAFormValues } from '@/shared/constants/qna';
import { useToastStore } from '@/store/useToastStore';

export function QnaManagementTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('scheduled');
  const qnas = useQnaStore((state) => state.qnas);
  const qnaActions = useQnaStore((state) => state.actions);
  const addToast = useToastStore((state) => state.actions.addToast);
  const emit = useSocketStore((state) => state.actions.emit);

  const scheduledQnas = useMemo(() => qnas.filter((qna) => qna.status === 'pending'), [qnas]);
  const activeQna = useMemo(() => qnas.find((qna) => qna.status === 'active'), [qnas]);
  const completedQnas = useMemo(() => qnas.filter((qna) => qna.status === 'ended'), [qnas]);
  const previousActiveQnaIdRef = useRef<string | null>(null);

  const qnaTabs: TabItem[] = useMemo(
    () => [
      { value: 'scheduled', count: scheduledQnas.length },
      { value: 'active', count: activeQna ? 1 : 0 },
      { value: 'completed', count: completedQnas.length },
    ],
    [scheduledQnas.length, activeQna, completedQnas.length],
  );

  const fetchQnas = useCallback(() => {
    emit('get_qna', (response) => {
      if (!response.success) {
        logger.socket.warn('Q&A 목록 조회 실패', response.error);
        return;
      }
      qnaActions.hydrateFromQnas(response.qnas);
    });
  }, [emit, qnaActions]);

  useEffect(() => {
    fetchQnas();
  }, [fetchQnas]);

  useEffect(() => {
    const currentActiveId = activeQna?.id ?? null;
    const previousActiveId = previousActiveQnaIdRef.current;

    if (!currentActiveId && previousActiveId) {
      setActiveTab('completed');
    }

    previousActiveQnaIdRef.current = currentActiveId;
  }, [activeQna?.id]);

  const handleCreateQna = useCallback(
    (data: QnAFormValues) => {
      emit('create_qna', data, (response) => {
        if (!response.success) {
          logger.socket.warn('Q&A 생성 실패', response.error);
          addToast({
            type: 'error',
            title: 'Q&A 생성에 실패했습니다.',
          });
          return;
        }
        fetchQnas();
      });
    },
    [emit, fetchQnas, addToast],
  );

  const handleStartQna = useCallback(
    (qnaId: string) => {
      emit('emit_qna', { qnaId }, (response) => {
        if (!response.success) {
          logger.socket.warn('Q&A 시작 실패', response.error);
          addToast({
            type: 'error',
            title: 'Q&A 시작에 실패했습니다.',
          });
          return;
        }
        setActiveTab('active');
        fetchQnas();
      });
    },
    [emit, fetchQnas, addToast],
  );

  const handleBreakQna = useCallback(() => {
    if (!activeQna) return;
    emit('break_qna', { qnaId: activeQna.id }, (response) => {
      if (!response.success) {
        logger.socket.warn('Q&A 종료 실패', response.error);
        addToast({
          type: 'error',
          title: 'Q&A 종료에 실패했습니다.',
        });
        return;
      }
      qnaActions.setCompletedFromEndDetail({
        qnaId: activeQna.id,
        title: activeQna.title,
        count: response.count,
        answers: response.answers,
      });
      setActiveTab('completed');
      fetchQnas();
    });
  }, [emit, activeQna, qnaActions, fetchQnas, addToast]);

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
              {activeTab === 'scheduled' && (
                <ScheduledQnaList
                  scheduledQnas={scheduledQnas}
                  onCreateQna={handleCreateQna}
                  onStartQna={handleStartQna}
                  isStartDisabled={Boolean(activeQna)}
                />
              )}
              {activeTab === 'active' && (
                <ActiveQnaSection
                  qna={activeQna}
                  onBreakQna={handleBreakQna}
                />
              )}
              {activeTab === 'completed' && <CompletedQnaSection qnas={completedQnas} />}
            </motion.div>
          </AnimatePresence>
        </TabContent>
      </Tabs>
    </>
  );
}

interface ScheduledQnaListProps {
  scheduledQnas: { id: string; title: string }[];
  onCreateQna: (data: QnAFormValues) => void;
  onStartQna: (qnaId: string) => void;
  isStartDisabled: boolean;
}

function ScheduledQnaList({
  scheduledQnas,
  onCreateQna,
  onStartQna,
  isStartDisabled,
}: ScheduledQnaListProps) {
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
              onEdit={() => {
                /* TODO: QnA 수정 추가 */
              }}
              onStart={() => onStartQna(qna.id)}
              isStartDisabled={isStartDisabled}
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
        onSubmit={onCreateQna}
      />
    </>
  );
}

interface ActiveQnaSectionProps {
  qna?: {
    id: string;
    title: string;
    timeLimit: number;
    startedAt: string;
    answers: { participantId: string; participantName: string; text: string }[];
  };
  onBreakQna: () => void;
}

function ActiveQnaSection({ qna, onBreakQna }: ActiveQnaSectionProps) {
  if (!qna) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        현재 진행중인 Q&A가 없습니다.
      </div>
    );
  }

  const totalResponses = qna.answers?.length ?? 0;
  const parsedStartedAt = qna.startedAt ? Date.parse(qna.startedAt) : NaN;
  const startedAt = Number.isNaN(parsedStartedAt) ? Date.now() : parsedStartedAt;

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
            timeLimitSeconds={qna.timeLimit}
            startedAt={startedAt}
            className="text-text w-auto justify-start text-xs"
            iconSize={14}
          />
        </div>
      </div>

      <div className="text-text flex min-h-0 flex-col gap-4 rounded-xl bg-gray-400 p-4">
        <h3 className="text-lg font-bold">{qna.title}</h3>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {qna.answers.length === 0 ? (
            <div className="text-subtext text-sm">답변이 없습니다.</div>
          ) : (
            qna.answers.map((answer, index) => (
              <div
                key={`${qna.id}-${index}`}
                className="flex gap-2 text-sm"
              >
                <span className="text-primary shrink-0 font-bold">
                  {answer.participantName || '익명'}
                </span>
                <p className="text-text">{answer.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        className="bg-error mt-auto w-full"
        onClick={onBreakQna}
      >
        종료하기
      </Button>
    </div>
  );
}

interface CompletedQnaSectionProps {
  qnas: {
    id: string;
    title: string;
    answers: { participantId: string; participantName: string; text: string }[];
  }[];
}

function CompletedQnaSection({ qnas }: CompletedQnaSectionProps) {
  const [expandedQnaIds, setExpandedQnaIds] = useState<Set<string>>(new Set());

  if (qnas.length === 0) {
    return (
      <div className="text-subtext flex min-h-0 flex-1 items-center justify-center text-sm font-bold">
        완료된 Q&A가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {qnas.map((qna) => {
        const isExpanded = expandedQnaIds.has(qna.id);
        const responses = qna.answers ?? [];
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
                    {responses.map((response, index) => (
                      <div
                        key={`${qna.id}-${index}`}
                        className="flex gap-2 text-sm"
                      >
                        <span className="text-primary shrink-0 font-bold">
                          {response.participantName || '익명'}
                        </span>
                        <p className="text-text">{response.text}</p>
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
