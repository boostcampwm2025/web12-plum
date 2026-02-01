import { useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '@/feature/room/stores/useMediaStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';

/**
 * 미디어 자원 해제 및 클린업을 담당하는 훅
 */
export const useMediaCleanup = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);

  /**
   * 방 퇴장 시 모든 미디어 자원 정리
   * - 모든 Producer/Consumer 종료
   * - 로컬 미디어 트랙 중지 및 스토어 초기화
   * - Transport 및 Device 종료
   * - 나머지 UI 상태 초기화
   */
  const leaveAndCleanup = useCallback(async () => {
    try {
      logger.media.info('[useMediaCleanup] 모든 미디어 자원 해제 시작');

      // 모든 Producer/Consumer 종료
      await Promise.allSettled([
        MediaConnectionService.stopAllProducers(),
        MediaConnectionService.stopAllConsumers(),
      ]);

      // 로컬 미디어 트랙 중지 및 스토어 초기화
      streamActions.clearStream();

      // Transport 및 Device 종료
      MediaConnectionService.cleanup();

      // 나머지 UI 상태 초기화
      mediaActions.resetRemoteStreams();
      mediaActions.setScreenStream(null);
      mediaActions.setScreenSharing(false);

      logger.media.info('[useMediaCleanup] 모든 미디어 자원 정리 및 퇴장 준비 완료');
    } catch (error) {
      logger.media.error('[useMediaCleanup] 정리 과정 중 오류 발생', error);
    }
  }, [streamActions, mediaActions]);

  return { leaveAndCleanup };
};
