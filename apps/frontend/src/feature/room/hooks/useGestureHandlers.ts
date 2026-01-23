import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { usePollGestureHandler } from './usePollGesture';
import { useBroadcastGestureHandler } from './useBroadcastGesture';

export type GestureHandler = {
  canHandle: (gesture: GestureType) => boolean;
  handle: (gesture: GestureType) => void;
};

export function useGestureHandlers() {
  const pollHandler = usePollGestureHandler();
  const broadcastHandler = useBroadcastGestureHandler();

  const handlers = useMemo<GestureHandler[]>(
    () => [pollHandler, broadcastHandler],
    [pollHandler, broadcastHandler],
  );

  const handleGesture = useCallback(
    (gesture: GestureType) => {
      const handler = handlers.find((h) => h.canHandle(gesture));
      handler?.handle(gesture);
    },
    [handlers],
  );

  const shouldAllowGesture = useCallback(
    (gesture: GestureType) => {
      return handlers.some((h) => h.canHandle(gesture));
    },
    [handlers],
  );

  return { handleGesture, shouldAllowGesture };
}
