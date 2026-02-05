import { Document, Page, View } from '@react-pdf/renderer';
import type { RoomSummary } from '@plum/shared-interfaces';

import { styles } from './styles';
import { registerFonts } from './registerFonts';
import { PDFHeader } from './components/PDFHeader';
import { PDFStatistics } from './components/PDFStatistics';
import { PDFPollResults } from './components/PDFPollResults';
import { PDFQnAResults } from './components/PDFQnAResults';
import { PDFLectureSummary } from './components/PDFLectureSummary';

registerFonts();

interface SummaryReportPDFProps {
  data: RoomSummary;
  date: string;
}

export function SummaryReportPDF({ data, date }: SummaryReportPDFProps) {
  return (
    <Document>
      {/* 표지 + 참여도 통계 */}
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        <PDFHeader
          roomTitle={data.name}
          date={date}
        />
        <PDFStatistics activityStatistics={data.activityStatistics} />
      </Page>

      {/* 투표 결과 - 내용이 많으면 자동으로 다음 페이지로 */}
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        <View
          style={styles.pageHeader}
          fixed
        >
          <PDFHeader
            roomTitle={data.name}
            date={date}
            compact
          />
        </View>
        <PDFPollResults polls={data.polls} />
      </Page>

      {/* QnA 결과 - 내용이 많으면 자동으로 다음 페이지로 */}
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        <View
          style={styles.pageHeader}
          fixed
        >
          <PDFHeader
            roomTitle={data.name}
            date={date}
            compact
          />
        </View>
        <PDFQnAResults qnas={data.qnas} />
      </Page>

      {/* 강의 요약 - 내용이 많으면 자동으로 다음 페이지로 */}
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        <View
          style={styles.pageHeader}
          fixed
        >
          <PDFHeader
            roomTitle={data.name}
            date={date}
            compact
          />
        </View>
        <PDFLectureSummary
          summary={data.summary}
          timelines={data.timelines}
          tags={data.tags}
        />
      </Page>
    </Document>
  );
}
