import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { RoomSummary as RoomSummaryData } from '@plum/shared-interfaces';

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
import { Loading } from '@/shared/components/Loading';
import { Button } from '@/shared/components/Button';
import { roomApi } from '@/shared/api/endpoints/room';

export function Summary() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('statistics');
  const [summaryData, setSummaryData] = useState<RoomSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);
      const response = await roomApi.getSummary(roomId);
      setSummaryData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading) {
    return (
      <>
        <Loading />
      </>
    );
  }

  if (error || !summaryData) {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md rounded-2xl bg-gray-500 p-8 text-center shadow-lg">
            <div className="mb-4 text-3xl">⚠️</div>
            <h2 className="text-text mb-2 text-xl font-bold">요약을 불러오지 못했어요</h2>
            <p className="text-subtext-light mb-6 text-sm">
              {error || '잠시 후 다시 시도해주세요.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="border border-gray-300 px-4 py-2 text-sm"
              >
                메인으로
              </Button>
              <Button
                onClick={fetchSummary}
                className="px-4 py-2 text-sm"
              >
                다시 시도
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  const tabContent: Record<Tab, JSX.Element> = {
    statistics: <StatisticsTab activityStatistics={summaryData.activityStatistics} />,
    poll: <PollResultsTab polls={summaryData.polls} />,
    qna: <QnAResultsTab qnas={summaryData.qnas} />,
    lecture: <LectureSummaryTab />,
  };

  return (
    <>
      <Header />
      <main className="px-12">
        <div className="mx-auto w-full max-w-4xl py-12">
          <PageSubHeader
            title="강의 요약"
            description="AI가 자동으로 생성한 회의 요약 내용입니다."
          />
          <ReportDownload
            roomTitle={summaryData.name}
            date={new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <Tabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
          {tabContent[activeTab]}
        </div>
      </main>
      <Footer />
    </>
  );
}
