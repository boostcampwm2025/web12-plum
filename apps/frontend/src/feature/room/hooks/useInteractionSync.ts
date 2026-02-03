import { useCallback } from 'react';
import { SocketClient } from '@/shared/socket/socket';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { useRankStore } from '../stores/useRankStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { logger } from '@/shared/lib/logger';

/**
 * 방 입장 시 상호작용 상태(투표, Q&A, 랭킹)를 서버와 동기화하는 훅
 *
 * 청중: 활성 투표/Q&A 조회 후 다이얼로그 자동 표시
 * 전체: 랭킹 정보 초기화
 */
/**
 * 강의실 입장 또는 재접속 시,
 * 현재 진행 중인 상호작용(투표, Q&A, 실시간 랭킹) 상태를 서버와 동기화하여 클라이언트 상태를 최신화하는 훅
 *
 * ## 주요 기능
 * 1. 투표 복구: 진행 중인 투표 정보 및 본인의 투표 여부를 확인하여 UI에 표시함
 * 2. Q&A 복구: 활성화된 Q&A 세션 정보를 가져옴
 * 3. 랭킹 초기화: 현재까지 누적된 활동 점수 및 랭킹 정보를 역할별로 매핑
 */
export function useInteractionSync() {
  const pollActions = usePollStore((state) => state.actions);
  const qnaActions = useQnaStore((state) => state.actions);
  const rankActions = useRankStore((state) => state.actions);

  /**
   * [청중 전용] 활성 투표 동기화
   * - 서버 응답에 따라 투표 데이터 스토어 저장 및 투표 여부 복구
   * - 진행 중인 투표가 있다면 투표 다이얼로그 자동 노출
   */
  const syncActivePoll = useCallback(async () => {
    try {
      const response = await SocketClient.emitWithAck('get_active_poll');
      if (!response.poll) return;

      pollActions.setActivePoll(response.poll);

      // 이미 참여한 투표라면 선택한 옵션 복구
      if (response.votedOptionId !== null) {
        pollActions.setAudienceVotedOption(response.poll.id, response.votedOptionId);
      }

      // 투표 다이얼로그 자동 표시
      const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
      if (activeDialog !== 'vote') setActiveDialog('vote');
    } catch (error) {
      logger.socket.info('[useInteractionSync] 투표 정보 조회 건너뜀 (진행 중인 투표 없음)', error);
    }
  }, [pollActions]);

  /**
   * [청중 전용] 활성 Q&A 동기화
   * - 서버 응답에 따라 Q&A 데이터 스토어 저장
   * - 진행 중인 Q&A가 있다면 Q&A 다이얼로그 자동 노출
   */
  const syncActiveQna = useCallback(async () => {
    try {
      const response = await SocketClient.emitWithAck('get_active_qna');
      if (!response.qna) return;

      qnaActions.setActiveQna(response.qna);
      if (response.answered) {
        qnaActions.setAnswered(response.qna.id, true);
      }

      // Q&A 다이얼로그 자동 표시
      const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
      if (!activeDialog) setActiveDialog('qna');
    } catch (error) {
      logger.socket.info('[useInteractionSync] Q&A 정보 조회 건너뜀 (진행 중인 Q&A 없음)', error);
    }
  }, [qnaActions]);

  /**
   * [공통] 랭킹 및 점수 정보 동기화
   * - 역할(Role)에 따라 수신 데이터 구조가 다름
   * - Presenter: 최하위권 포함
   * - Audience: 본인 점수 포함
   */
  const syncRankInfo = useCallback(
    async (role: string) => {
      try {
        const response = await SocketClient.emitWithAck('get_activity_score_rank');
        logger.socket.info('[useInteractionSync] 랭킹 정보 수신', { role, response });

        if (role === 'presenter') {
          rankActions.initializeRank({
            top: response.top,
            lowest: 'lowest' in response ? response.lowest : null,
          });
        } else {
          rankActions.initializeRank({
            top: response.top,
            score: 'score' in response ? response.score : 0,
          });
        }
      } catch (error) {
        logger.socket.error('[useInteractionSync] 랭킹 정보 조회 실패', error);
      }
    },
    [rankActions],
  );

  /**
   * 상호작용 상태 전체 동기화
   *
   * @param role - 사용자 역할 ('presenter' | 'audience' | 'participant')
   */
  const syncInteractionState = useCallback(
    async (role: string) => {
      const tasks = [syncRankInfo(role)];
      if (role === 'audience') tasks.push(syncActivePoll(), syncActiveQna());
      await Promise.allSettled(tasks);
      await syncActivePoll();
      await syncActiveQna();
    },
    [syncActivePoll, syncActiveQna, syncRankInfo],
  );

  return { syncInteractionState };
}
