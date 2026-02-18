import { useState, useMemo } from 'react';

import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useSummaryStore } from '../store/useSummaryStore';
import { downloadSummaryReport } from '../pdf/useSummaryReportDownload';
import { getRelativeTimelines } from '../utils';

/**
 * 강의 요약 리포트 다운로드 컴포넌트
 * 스토어에서 summaryData를 직접 구독
 */
export function ReportDownload() {
  const [isLoading, setIsLoading] = useState(false);

  const summaryData = useSummaryStore((state) => state.summaryData);
  const timelines = summaryData?.timelines ?? [];
  const relativeTimelines = useMemo(() => getRelativeTimelines(timelines), [timelines]);
  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { addToast } = useToastStore((state) => state.actions);

  const handleDownload = async () => {
    if (!summaryData) return;

    try {
      setIsLoading(true);
      // timelines를 상대 시간으로 가공된 데이터로 교체
      const dataWithRelativeTimelines = { ...summaryData, timelines: relativeTimelines };
      await downloadSummaryReport({ data: dataWithRelativeTimelines, date });
    } catch {
      addToast({ type: 'error', title: 'PDF 생성에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-10 flex items-center gap-3 rounded-2xl bg-gray-600 p-6">
      <div className="flex grow flex-col gap-3">
        <h3 className="text-text text-2xl font-bold">{summaryData?.name || ''}</h3>
        <p className="text-subtext-light font-bold">{date}</p>
      </div>

      <Button
        className="flex items-center gap-4 rounded-lg px-7 py-4"
        onClick={handleDownload}
        disabled={isLoading}
      >
        <Icon
          name="download"
          size={24}
          className="text-text"
        />
        <span className="text-text">{isLoading ? '생성 중...' : '리포트 다운로드'}</span>
      </Button>
    </section>
  );
}
