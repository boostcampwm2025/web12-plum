import { useCallback } from 'react';

import { useChatStore } from '@/feature/chat/stores/useChatStore';
import { PollService } from '@/feature/poll/services/poll';
import { usePollStore } from '@/feature/poll/stores/usePollStore';
import { QnaService } from '@/feature/qna/services/qna';
import { useQnaStore } from '@/feature/qna/stores/useQnaStore';
import { useRankStore } from '@/feature/rank/stores/useRankStore';

import { playSound } from '@/shared/lib/sound';
import { useToastStore } from '@/shared/stores/useToastStore';

import { InteractionService } from '../services/interaction';
import { useRoomUIStore } from '../stores/useRoomUIStore';

/**
 * Audience 전용 이벤트 핸들러
 *
 * - Poll: 투표 시작/진행/종료 UI (참여자 관점)
 * - QnA: Q&A 시작/진행/종료 UI (참여자 관점)
 * - Interaction: 내 점수/랭킹 업데이트, 제스처 토스트
 */
export function useAudienceEventHandlers() {
  const pollActions = usePollStore((state) => state.actions);
  const qnaActions = useQnaStore((state) => state.actions);
  const rankActions = useRankStore((state) => state.actions);
  const chatActions = useChatStore((state) => state.actions);
  const toastActions = useToastStore((state) => state.actions);

  /**
   * Audience 전용 이벤트 핸들러 등록
   *
   * - Poll, QnA, Interaction 서비스에서 Audience 그룹에 맞는 핸들러 등록
   * - Poll: 투표 시작/진행/종료 UI (참여자 관점)
   * - QnA: Q&A 시작/진행/종료 UI (참여자 관점)
   * - Interaction: 내 점수/랭킹 업데이트, 제스처 토스트
   */
  const setupAudienceHandlers = useCallback((): void => {
    PollService.setupAudienceEventHandlers({
      onUpdatePoll: pollActions.updatePollOptions,
      onStartPoll: (data) => {
        pollActions.setActivePoll(data);
        const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
        if (activeDialog !== 'vote') {
          playSound('pop');
          setActiveDialog('vote');
        }
      },
      onPollEnd: (data) => {
        pollActions.clearActivePoll(data.pollId);
        const { activeDialog, setActiveDialog, setPollResult } = useRoomUIStore.getState();
        if (activeDialog === 'vote') setActiveDialog('vote');
        setPollResult(data);
      },
    });
    QnaService.setupAudienceEventHandlers({
      onUpdateQna: qnaActions.updateQnaSub,
      onStartQna: (data) => {
        qnaActions.setActiveQna(data);
        const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
        if (activeDialog !== 'qna') {
          playSound('pop');
          setActiveDialog('qna');
        }
      },
      onQnaEnd: (data) => {
        qnaActions.clearActiveQna(data.qnaId);
        const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
        if (activeDialog === 'qna') setActiveDialog('qna');
        const hasText = data.text && data.text.length > 0;
        toastActions.addToast({
          type: 'info',
          title: 'Q&A가 종료되었습니다.',
          ...(hasText && { description: 'Q&A 결과를 채팅창에서 확인하세요.' }),
        });

        if (hasText) chatActions.addQnaResult(data);
      },
    });
    InteractionService.setupAudienceEventHandlers({
      onScoreUpdate: rankActions.updateMyScore,
      onRankUpdate: rankActions.updateRank,
      onUpdateGestureStatus: (data) =>
        toastActions.addToast({
          type: 'gesture',
          title: data.participantName,
          gesture: data.gesture,
        }),
    });
  }, [pollActions, qnaActions, rankActions, chatActions, toastActions]);

  /**
   * Audience 전용 이벤트 핸들러 제거
   *
   * - Poll, QnA, Interaction 서비스에서 Audience 그룹에 등록된 핸들러만 제거
   */
  const removeAudienceHandlers = useCallback(() => {
    PollService.removeEventHandlersByGroup('audience');
    QnaService.removeEventHandlersByGroup('audience');
    InteractionService.removeEventHandlersByGroup('audience');
  }, []);

  return { setupAudienceHandlers, removeAudienceHandlers };
}
