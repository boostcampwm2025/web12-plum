import { useState } from 'react';
import type { RoomSummary } from '@plum/shared-interfaces';

import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { useToastStore } from '@/store/useToastStore';
import { downloadSummaryReport } from '../pdf/useSummaryReportDownload';

interface ReportDownloadProps {
  roomTitle: string;
  date: string;
  summaryData: RoomSummary;
}

/**
 * 강의 요약 리포트 다운로드 컴포넌트
 * @param roomTitle 강의실 제목
 * @param date 강의 날짜
 * @param summaryData 요약 데이터
 */
export function ReportDownload({ roomTitle, date, summaryData }: ReportDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToastStore((state) => state.actions);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      await downloadSummaryReport({ data: summaryData, date });
    } catch {
      addToast({ type: 'error', title: 'PDF 생성에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-10 flex items-center gap-3 rounded-2xl bg-gray-600 p-6">
      <div className="flex grow flex-col gap-3">
        <h3 className="text-text text-2xl font-bold">{roomTitle}</h3>
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
