import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { useParams } from 'react-router';
import { useRoomStore } from '../stores/useRoomStore';
import { useSocketStore } from '@/store/useSocketStore';
import { logger } from '@/shared/lib/logger';
import type { GestureHandler } from './useGestureHandlers';

export function useBroadcastGestureHandler(): GestureHandler {
  const { roomId } = useParams();
  const myInfo = useRoomStore((state) => state.myInfo);
  const { emit } = useSocketStore((state) => state.actions);

  const canHandle = useCallback((): boolean => {
    return Boolean(roomId && myInfo?.id);
  }, [roomId, myInfo?.id]);

  const handle = useCallback(
    (gesture: GestureType) => {
      if (!roomId || !myInfo?.id) {
        logger.socket.warn('제스처 전송 불가: roomId 또는 participantId 없음', {
          roomId,
          participantId: myInfo?.id,
        });
        return;
      }
      emit('action_gesture', { gesture }, (res) => {
        if (!res.success) {
          logger.socket.warn('제스처 전송 실패', res.error);
        }
      });
    },
    [emit, roomId, myInfo?.id],
  );

  return useMemo(() => ({ canHandle, handle }), [canHandle, handle]);
}
