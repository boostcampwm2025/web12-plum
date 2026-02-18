import { useCallback, useMemo } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { useParams } from 'react-router';
import { useRoomStore } from '../stores/useRoomStore';
import { logger } from '@/shared/lib/logger';
import type { GestureHandler } from './useGestureHandlers';
import { SocketClient } from '@/shared/socket/socket';

export function useBroadcastGestureHandler(): GestureHandler {
  const { roomId } = useParams();
  const myInfo = useRoomStore((state) => state.myInfo);

  const canHandle = useCallback((): boolean => {
    return Boolean(roomId && myInfo?.id);
  }, [roomId, myInfo?.id]);

  const handle = useCallback(
    async (gesture: GestureType) => {
      if (!roomId || !myInfo?.id) {
        logger.socket.warn('제스처 전송 불가: roomId 또는 participantId 없음', {
          roomId,
          participantId: myInfo?.id,
        });
        return;
      }

      try {
        await SocketClient.emitWithAck('action_gesture', { gesture });
      } catch (error) {
        logger.custom.error('[useBroadcastGesture] 제스처 전송 실패', error);
      }
    },
    [roomId, myInfo?.id],
  );

  return useMemo(() => ({ canHandle, handle }), [canHandle, handle]);
}
