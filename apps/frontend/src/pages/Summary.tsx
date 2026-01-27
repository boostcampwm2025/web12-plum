import { useState } from 'react';

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

/**
 * 요약 페이지 탭 콘텐츠 매핑
 */
const TAB_CONTENT: Record<Tab, () => JSX.Element> = {
  statistics: StatisticsTab,
  poll: PollResultsTab,
  qna: QnAResultsTab,
  lecture: LectureSummaryTab,
};

const mockReportData = {
  roomTitle: '웹 풀스택',
  date: '2025년 12월 24일',
};

export function Summary() {
  const [activeTab, setActiveTab] = useState<Tab>('statistics');
  const ActiveTabContent = TAB_CONTENT[activeTab];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl py-12">
        <PageSubHeader
          title="강의 요약"
          description="AI가 자동으로 생성한 회의 요약 내용입니다."
        />
        <ReportDownload
          roomTitle={mockReportData.roomTitle}
          date={mockReportData.date}
        />
        <Tabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
        />
        <ActiveTabContent />
      </main>
      <Footer />
    </>
  );
}
