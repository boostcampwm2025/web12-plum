import { useEffect } from 'react';

import { useSummaryStore } from '@/store/useSummaryStore';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { roomApi } from '@/shared/api/endpoints/room';
import { logger } from '@/shared/lib/logger';

// 폴링 간격 (10초)
const POLLING_INTERVAL = 10000;

/**
 * 강의 종료 후 AI 요약 결과가 아직 생성 중인 경우, 서버에 주기적으로 데이터를 요청하여 업데이트
 *
 * 1. AI 요약은 강의 텍스트 분석에 시간이 소요됨
 * 2. 요약 페이지 진입 시점에 데이터가 비어 있을 수 있음
 * 3. `summaryData.summary` 필드가 비어있다면 '생성 중'인 것으로 간주하고 Polling 시작
 * 4. 데이터가 성공적으로 확보(summary 존재)되면 즉시 타이머를 중단하고 자원을 해제
 */
export function useAiSummaryPolling() {
  const roomId = useSafeRoomId();
  const summaryData = useSummaryStore((state) => state.summaryData);

  const { setSummaryData } = useSummaryStore((state) => state.actions);

  /**
   * AI 요약 데이터가 없을 때만 폴링 시작
   * 데이터가 수신되면 폴링 중지
   */
  useEffect(() => {
    const isAiSummaryPending = summaryData && !summaryData.summary;
    if (!isAiSummaryPending) return;

    /**
     * 주기적으로 서버에 최신 요약 데이터를 요청하는 인터벌 타이머
     */
    const intervalId = setInterval(async () => {
      try {
        const response = await roomApi.getSummary(roomId!);
        setSummaryData(response.data);

        // 데이터가 생성 완료되었다면 타이머 종료
        if (response.data.summary) {
          clearInterval(intervalId);
          logger.info('[useAiSummaryPolling] AI 요약 데이터 수신 성공 및 타이머 종료');
        }
      } catch (err) {
        logger.error('AI 요약 polling 실패', { error: err });
      }
    }, POLLING_INTERVAL);

    // 컴포넌트 언마운트 시 인터벌 제거
    return () => clearInterval(intervalId);
  }, [summaryData?.summary, roomId, setSummaryData]);
}
