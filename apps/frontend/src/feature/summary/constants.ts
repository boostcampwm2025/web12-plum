/**
 * 요약 페이지 탭
 */
export const TABS = [
  { key: 'statistics', label: '참여도 통계' },
  { key: 'poll', label: '투표 결과' },
  { key: 'qna', label: 'QnA 결과' },
  { key: 'lecture', label: '강의 요약' },
] as const;

export type Tab = (typeof TABS)[number]['key'];
