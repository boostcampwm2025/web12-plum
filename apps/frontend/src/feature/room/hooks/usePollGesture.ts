import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { usePollStore } from '../stores/usePollStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useSocketStore } from '@/store/useSocketStore';
import type { GestureHandler } from './useGestureHandlers';

const NUMERIC_GESTURES = ['one', 'two', 'three', 'four'] as const;
type NumericGesture = (typeof NUMERIC_GESTURES)[number];

const POLL_GESTURE_MAP: Record<NumericGesture, number> = {
  one: 0,
  two: 1,
  three: 2,
  four: 3,
};

function isNumericGesture(gesture: GestureType): gesture is NumericGesture {
  return NUMERIC_GESTURES.includes(gesture as NumericGesture);
}

// audience 역할이고, vote 다이얼로그가 열려있고, 활성 투표가 있고, 아직 투표하지 않은 경우에만 처리
export function usePollGestureHandler(): GestureHandler {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const polls = usePollStore((state) => state.polls);
  const audienceVotedOptionByPollId = usePollStore((state) => state.audienceVotedOptionByPollId);
  const pollActions = usePollStore((state) => state.actions);
  const myRole = useRoomStore((state) => state.myInfo?.role);
  const { emit } = useSocketStore((state) => state.actions);

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
    (gesture: GestureType) => {
      if (!isNumericGesture(gesture) || !activePoll) return;

      const optionIndex = POLL_GESTURE_MAP[gesture];
      pollActions.setAudienceVotedOption(activePoll.id, optionIndex);
      emit('vote', { pollId: activePoll.id, optionId: optionIndex }, (response) => {
        if (!response.success) {
          pollActions.setAudienceVotedOption(activePoll.id, null);
        }
      });
    },
    [activePoll, pollActions, emit],
  );

  return useMemo(() => ({ canHandle, handle }), [canHandle, handle]);
}
