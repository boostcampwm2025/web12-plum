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
