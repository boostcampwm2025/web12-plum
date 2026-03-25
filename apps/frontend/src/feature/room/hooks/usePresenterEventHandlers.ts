import { useCallback } from 'react';

import { PollService } from '@/feature/poll/services/poll';
import { usePollStore } from '@/feature/poll/stores/usePollStore';
import { QnaService } from '@/feature/qna/services/qna';
import { useQnaStore } from '@/feature/qna/stores/useQnaStore';
import { useRankStore } from '@/feature/rank/stores/useRankStore';

import { useToastStore } from '@/shared/stores/useToastStore';

import { InteractionService } from '../services/interaction';

/**
 * Presenter 전용 이벤트 핸들러
 *
 * - Poll: 투표 상세 결과 수신 (모든 투표자 정보 포함)
 * - QnA: Q&A 상세 결과 수신 (모든 답변 정보 포함)
 * - Interaction: 랭킹 업데이트, 청중 제스처 토스트
 */
export function usePresenterEventHandlers() {
  const pollActions = usePollStore((state) => state.actions);
  const qnaActions = useQnaStore((state) => state.actions);
  const rankActions = useRankStore((state) => state.actions);
  const toastActions = useToastStore((state) => state.actions);

  /**
   * Presenter 전용 이벤트 핸들러 등록
   *
   * - Poll, QnA, Interaction 서비스에서 Presenter 그룹에 맞는 핸들러 등록
   * - Poll: 투표 상세 결과 수신 (모든 투표자 정보 포함)
   * - QnA: Q&A 상세 결과 수신 (모든 답변 정보 포함)
   * - Interaction: 랭킹 업데이트, 청중 제스처 토스트
   */
  const setupPresenterHandlers = useCallback((): void => {
    PollService.setupPresenterEventHandlers({
      onUpdatePollDetail: (data) => {
        const updatedVoter = { ...data.voter, optionId: data.voter.optionId };
        pollActions.updatePollDetail({ ...data, voter: updatedVoter });
      },
      onPollEndDetail: pollActions.setCompletedFromEndDetail,
    });
    QnaService.setupPresenterEventHandlers({
      onUpdateQnaDetail: qnaActions.updateQnaDetail,
      onQnaEndDetail: qnaActions.setCompletedFromEndDetail,
    });
    InteractionService.setupPresenterEventHandlers({
      onPresenterRankUpdate: rankActions.updatePresenterRank,
      onUpdateGestureStatus: (data) =>
        toastActions.addToast({
          type: 'gesture',
          title: data.participantName,
          gesture: data.gesture,
        }),
    });
  }, [pollActions, qnaActions, rankActions, toastActions]);

  /**
   * Presenter 전용 이벤트 핸들러 제거
   *
   * - Poll, QnA, Interaction 서비스에서 Presenter 그룹에 등록된 핸들러만 제거
   */
  const removePresenterHandlers = useCallback(() => {
    PollService.removeEventHandlersByGroup('presenter');
    QnaService.removeEventHandlersByGroup('presenter');
    InteractionService.removeEventHandlersByGroup('presenter');
  }, []);

  return { setupPresenterHandlers, removePresenterHandlers };
}
