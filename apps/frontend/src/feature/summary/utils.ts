/**
 * 전체값 대비 부분값의 비율(백분율)을 계산 함수
 * @param value 부분값
 * @param total 전체값
 * @param precision 소수점 자릿수 (기본값: 0)
 * @returns 백분율 값
 */
export const calculatePercentage = (
  value: number,
  total: number,
  precision: number = 0,
): number => {
  if (total <= 0) return 0;

  const percentage = (value / total) * 100;
  const roundedPercentage = Number(percentage.toFixed(precision));
  return roundedPercentage;
};

/**
 * 초 단위 시간을 MM:SS 형식으로 변환
 * @param seconds 초 단위 시간
 * @returns MM:SS 형식의 시간 문자열
 */
export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
