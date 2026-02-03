import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { RoomSummary as RoomSummaryData } from '@plum/shared-interfaces';
import { AnimatePresence, motion } from 'motion/react';
import { logger } from '@sentry/react';

import { Footer } from '@/shared/components/Footer';
import { Header } from '@/shared/components/Header';
import { PageSubHeader } from '@/shared/components/PageSubHeader';
import { StatisticsTab } from '@/feature/summary/components/StatisticsTab';
import { ReportDownload } from '@/feature/summary/components/ReportDownload';
import { PollResultsTab } from '@/feature/summary/components/PollResultsTab';
import { QnAResultsTab } from '@/feature/summary/components/QnAResultsTab';
import { LectureSummaryTab } from '@/feature/summary/components/LectureSummaryTab';
import { Tab } from '@/feature/summary/constants';
import { Tabs } from '@/feature/summary/components/Tabs';
import { AsyncBoundary } from '@/shared/components/AsyncBoundary';
import { ErrorFallback } from '@/shared/components/ErrorFallback';
import { roomApi } from '@/shared/api/endpoints/room';
import { formatSummaryAvailableUntil } from '@/shared/lib/date';

export function Summary() {
  const { roomId } = useParams<{ roomId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('statistics');
  const [summaryData, setSummaryData] = useState<RoomSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);
      setHasError(false);
      const response = await roomApi.getSummary(roomId);
      setSummaryData(response.data);
      setFetchedAt(new Date());
    } catch (err) {
      logger.error('요약 데이터 불러오기 실패', { error: err });
      setHasError(true);
      setFetchedAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const tabContent: Record<Tab, JSX.Element> | null = summaryData
    ? {
        statistics: <StatisticsTab activityStatistics={summaryData.activityStatistics} />,
        poll: <PollResultsTab polls={summaryData.polls} />,
        qna: <QnAResultsTab qnas={summaryData.qnas} />,
        lecture: <LectureSummaryTab />,
      }
    : null;

  return (
    <AsyncBoundary
      isLoading={isLoading}
      isError={hasError || !summaryData}
      errorFallback={
        <ErrorFallback
          title="요약을 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
          onRetry={fetchSummary}
        />
      }
    >
      <Header />
      <main className="px-12">
        <div className="mx-auto w-full max-w-4xl py-12">
          <PageSubHeader
            title="강의 요약"
            description="AI가 자동으로 생성한 회의 요약 내용입니다."
          />
          <ReportDownload
            roomTitle={summaryData!.name}
            date={new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          {fetchedAt && (
            <section className="mt-3 px-1 text-right">
              <p className="text-subtext-light text-xs">
                {formatSummaryAvailableUntil(fetchedAt)}
                까지 조회 가능
              </p>
            </section>
          )}
          <Tabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tabContent![activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </AsyncBoundary>
  );
}
