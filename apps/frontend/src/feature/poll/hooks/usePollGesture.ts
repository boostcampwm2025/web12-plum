import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';

import { GestureHandler } from '@/feature/gesture/hooks/useGestureHandlers';
import { isNumericGesture, NumericGesture } from '@/feature/gesture/lib/gestureCategory';
import { PollService } from '@/feature/poll/services/poll';
import { usePollStore } from '@/feature/poll/stores/usePollStore';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { useRoomUIStore } from '@/feature/room/stores/useRoomUIStore';

import { logger } from '@/shared/lib/logger';

const POLL_GESTURE_MAP: Record<NumericGesture, number> = {
  one: 0,
  two: 1,
  three: 2,
  four: 3,
};

// audience 역할이고, vote 다이얼로그가 열려있고, 활성 투표가 있고, 아직 투표하지 않은 경우에만 처리
export function usePollGestureHandler(): GestureHandler {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const polls = usePollStore((state) => state.polls);
  const audienceVotedOptionByPollId = usePollStore((state) => state.audienceVotedOptionByPollId);
  const pollActions = usePollStore((state) => state.actions);
  const myRole = useRoomStore((state) => state.myInfo?.role);

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'active'), [polls]);
  const selectedOptionId = activePoll ? (audienceVotedOptionByPollId[activePoll.id] ?? null) : null;

  const canVote =
    myRole === 'audience' &&
    activeDialog === 'vote' &&
    Boolean(activePoll) &&
    selectedOptionId === null;

  const canHandle = useCallback(
    (gesture: GestureType): boolean => {
      if (!isNumericGesture(gesture)) return false;
      if (!canVote || !activePoll) return false;

      const optionIndex = POLL_GESTURE_MAP[gesture];
      return optionIndex < activePoll.options.length;
    },
    [canVote, activePoll],
  );

  const handle = useCallback(
    async (gesture: GestureType) => {
      if (!isNumericGesture(gesture) || !activePoll) return;

      const optionIndex = POLL_GESTURE_MAP[gesture];
      pollActions.setAudienceVotedOption(activePoll.id, optionIndex);
      try {
        await PollService.vote({
          pollId: activePoll.id,
          optionId: optionIndex,
          isGesture: true,
        });
      } catch (error) {
        logger.custom.error('[usePollGesture] 제스처 투표 전송 실패', error);
        pollActions.setAudienceVotedOption(activePoll.id, null);
      }
    },
    [activePoll, pollActions],
  );

  return useMemo(() => ({ canHandle, handle }), [canHandle, handle]);
}
