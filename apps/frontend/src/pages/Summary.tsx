import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
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
import { useToastStore } from '@/store/useToastStore';
import { useSummaryStore } from '@/store/useSummaryStore';
import { useAiSummaryPolling } from '@/feature/summary/hooks/useAiSummaryPolling';
import { ROUTES } from '@/app/routes/routes';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';

/**
 * Summary 페이지 컴포넌트
 *
 * 강의실 세션이 종료된 후, 해당 강의의 통계 및 결과물을 종합하여 보여주는 대시보드
 *
 * 1. 아직 종료되지 않은 강의실 ID로 접근 시 서버 에러를 반환하며, 이를 캐치하여 홈으로 리다이렉트 (부정 진입 차단)
 * 2. 로딩 스피너와 에러 폴백을 `AsyncBoundary`로 캡슐화하여 데이터 로드 중 일관된 UI를 보장
 * 3. `AnimatePresence`와 `motion`을 활용해 통계, 투표, Q&A 등 각 데이터 영역 전환 시 전환 효과 제공
 * 4. 요약본의 보관 기한을 사용자에게 명시하여 데이터 유실에 대비하도록 유도
 */
export function Summary() {
  const navigate = useNavigate();
  const roomId = useSafeRoomId();
  const summaryData = useSummaryStore((state) => state.summaryData);

  const [activeTab, setActiveTab] = useState<Tab>('statistics');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const { addToast } = useToastStore((state) => state.actions);
  const { setSummaryData } = useSummaryStore((state) => state.actions);

  /**
   * 강의 종료 후 AI 요약 결과가 아직 생성 중인 경우, 서버에 주기적으로 데이터를 요청하여 업데이트
   * `summaryData.summary` 필드가 비어있다면 '생성 중'인 것으로 간주하고 Polling 시작
   * 데이터가 성공적으로 확보(summary 존재)되면 즉시 타이머를 중단하고 자원을 해제
   */
  useAiSummaryPolling();

  /**
   * 강의 요약 데이터를 서버로부터 가져오는 핵심 함수
   *
   * ## 실행 순서 및 정책
   *
   * 1. 로딩 플래그를 활성화하고 이전 에러 상태를 초기화
   * 2. `roomApi.getSummary`를 통해 강의 통계, 투표 결과, Q&A 내역 등을 한 번에 수신
   * 3. 성공 처리:
   *   - 수신된 데이터를 `summaryData` 스토어에 저장
   *   - `fetchedAt`을 기록하여 데이터 유효 기간 계산의 기준점으로 삼음
   * 4. 실패 및 예외 처리:
   *   - 강의가 진행 중인 경우 로그에 기록하고 토스트 알림을 띄움
   *   - 보안을 위해 즉시 메인 페이지로 리다이렉트 처리
   */
  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      // 강의 요약 데이터 요청
      const response = await roomApi.getSummary(roomId!);
      setSummaryData(response.data);
      setFetchedAt(new Date());
    } catch (err) {
      // 강의가 아직 종료되지 않은 경우
      logger.error('요약 데이터 불러오기 실패', { error: err });
      addToast({ type: 'error', title: '강의가 종료되면 요약을 확인하실 수 있습니다.' });
      navigate(ROUTES.HOME, { replace: true });

      setHasError(true);
      setFetchedAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, navigate, addToast, setSummaryData]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const tabContent: Record<Tab, JSX.Element> | null = summaryData
    ? {
        statistics: <StatisticsTab />,
        poll: <PollResultsTab />,
        qna: <QnAResultsTab />,
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
            roomTitle={summaryData?.name || ''}
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
              {tabContent?.[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </AsyncBoundary>
  );
}
