const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatKoreanDateTime(date: Date) {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatSummaryAvailableUntil(fetchedAt: Date) {
  return formatKoreanDateTime(new Date(fetchedAt.getTime() + ONE_DAY_MS));
}
