import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';

interface ReportDownloadProps {
  roomTitle: string;
  date: string;
}

/**
 * 강의 요약 리포트 다운로드 컴포넌트
 * @param roomTitle 강의실 제목
 * @param date 강의 날짜
 */
export function ReportDownload({ roomTitle, date }: ReportDownloadProps) {
  return (
    <section className="mt-12 flex items-center gap-3 rounded-2xl bg-gray-600 p-6">
      <div className="flex grow flex-col gap-3">
        <h3 className="text-text text-2xl font-bold">{roomTitle}</h3>
        <p className="text-subtext-light font-bold">{date}</p>
      </div>

      <Button className="flex items-center gap-4 rounded-lg px-7 py-4">
        <Icon
          name="download"
          size={24}
          className="text-text"
        />
        <span className="text-text">리포트 다운로드</span>
      </Button>
    </section>
  );
}
