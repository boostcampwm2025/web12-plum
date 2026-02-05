import { useMemo } from 'react';
import type { Timelines } from '@plum/shared-interfaces';

import { useSummaryStore } from '../store/useSummaryStore';
import { formatTime, getRelativeTimelines } from '../utils';

/**
 * AI가 추출한 강의의 핵심 키워드를 해시태그 형식의 뱃지로 렌더링
 *
 * Zustand 스토어에서 직접 태그 목록을 구독
 * 데이터가 없을 경우 레이아웃을 차지하지 않도록 처리
 */
function Tags() {
  const tags = useSummaryStore((state) => state.summaryData?.tags || []);

  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

/**
 * 강의의 특정 구간에 대한 요약 정보를 카드 형태로 렌더링
 *
 * @param content - 해당 구간의 요약 내용
 * @param startedAt - 기준 시점(0초) 대비 상대적인 시작 시간 (단위: 초)
 * @param endedAt - 기준 시점(0초) 대비 상대적인 종료 시간 (단위: 초)
 */
function TimelineItem({ content, startedAt, endedAt }: Timelines) {
  const timeRange = `${formatTime(startedAt)} ~ ${formatTime(endedAt)}`;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-300 p-6">
      <p className="text-text text-sm">{timeRange}</p>
      <p className="text-subtext-light leading-relaxed break-keep">{content}</p>
    </article>
  );
}

/**
 * 전체 타임라인 데이터를 순회하며 리스트를 렌더링
 * getRelativeTimelines 유틸로 상대 시간으로 가공된 데이터 사용
 */
function TimelineList() {
  const rawTimelines = useSummaryStore((state) => state.summaryData?.timelines ?? []);
  const timelines = useMemo(() => getRelativeTimelines(rawTimelines), [rawTimelines]);

  if (timelines.length === 0) {
    return <p className="text-subtext-light py-4 text-center">시간대별 요약이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {timelines.map((timeline, index) => (
        <TimelineItem
          key={index}
          content={timeline.content}
          startedAt={timeline.startedAt}
          endedAt={timeline.endedAt}
        />
      ))}
    </div>
  );
}

/**
 * AI 분석 프로세스가 아직 진행 중이거나 서버 응답을 대기 중일 때 표시
 *
 * `useAiSummaryPolling` 훅이 데이터를 성공적으로 가져오기 전까지 사용자에게 시각적 피드백 제공
 */
function SummaryPendingSection() {
  return (
    <section className="mt-10 flex flex-col items-center gap-4 rounded-2xl bg-gray-600 p-10">
      <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      <p className="text-subtext-light text-center">
        AI가 강의 내용을 요약하고 있습니다.
        <br />
        잠시만 기다려주세요.
      </p>
    </section>
  );
}

/**
 * '강의 요약' 탭의 최상위 컴포넌트로
 *
 * 데이터의 유무에 따라 '준비 중' 섹션 또는 '전체 결과' 섹션 분기 처리
 * Zustand 스토어의 `summary` 필드 존재 여부를 분석 완료의 기준으로 판단
 */
export function LectureSummaryTab() {
  const summary = useSummaryStore((state) => state.summaryData?.summary);
  const isAiSummaryPending = !summary;

  if (isAiSummaryPending) {
    return <SummaryPendingSection />;
  }

  return (
    <>
      <section className="mt-10 flex flex-col gap-6 rounded-2xl bg-gray-600 p-6">
        <h4 className="text-text text-xl font-bold">AI 요약</h4>
        <p className="text-subtext-light leading-relaxed break-keep">{summary}</p>
        <Tags />
      </section>

      <section className="mt-10 flex flex-col gap-6 rounded-2xl bg-gray-600 p-6">
        <h4 className="text-text text-xl font-bold">시간대별 요약</h4>
        <TimelineList />
      </section>
    </>
  );
}
