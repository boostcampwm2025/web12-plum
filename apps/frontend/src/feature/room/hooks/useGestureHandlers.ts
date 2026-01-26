import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { usePollGestureHandler } from './usePollGesture';
import { useBroadcastGestureHandler } from './useBroadcastGesture';
import { getGestureCategory, type GestureCategory } from './gestureCategory';

export type GestureHandler = {
  canHandle: (gesture: GestureType) => boolean;
  handle: (gesture: GestureType) => void;
};

export function useGestureHandlers() {
  const pollHandler = usePollGestureHandler();
  const broadcastHandler = useBroadcastGestureHandler();

  const handlerMap = useMemo<Record<GestureCategory, GestureHandler>>(
    () => ({
      numeric: pollHandler,
      reaction: broadcastHandler,
      pose: broadcastHandler,
    }),
    [pollHandler, broadcastHandler],
  );

  const handleGesture = useCallback(
    (gesture: GestureType) => {
      const category = getGestureCategory(gesture);
      const handler = handlerMap[category];
      if (handler.canHandle(gesture)) {
        handler.handle(gesture);
      }
    },
    [handlerMap],
  );

  const shouldAllowGesture = useCallback(
    (gesture: GestureType) => {
      const category = getGestureCategory(gesture);
      const handler = handlerMap[category];
      return handler.canHandle(gesture);
    },
    [handlerMap],
  );

  return { handleGesture, shouldAllowGesture };
}
