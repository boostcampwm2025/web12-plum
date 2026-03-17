import { useCallback } from 'react';

import { logger } from '@/shared/lib/logger';
import { MediaConnectionService } from '@/shared/mediasoup/mediaConnection.service';
import { useStreamStore } from '@/shared/stores/useLocalStreamStore';

import { useMediaStore } from '../stores/useMediaStore';

/**
 * 미디어 자원 해제 및 클린업을 담당하는 훅
 *
 * 방 퇴장 시 모든 미디어 관련 자원을 정리하는 역할
 *
 * - useLocalMedia, useRemoteMedia는 각각 송출/수신 책임만 가짐
 * - 퇴장 시 양쪽 모두 정리해야 하므로 별도 훅으로 분리
 * - 단일 책임 원칙 (SRP) 준수
 *
 * ## 정리 대상
 * - Producer: 내가 송출 중인 미디어 (audio, video, screen)
 * - Consumer: 상대방에게서 수신 중인 미디어
 * - Transport: 서버와의 WebRTC 연결
 * - Device: mediasoup Device 인스턴스
 * - 로컬 트랙: getUserMedia로 획득한 MediaStreamTrack
 * - Zustand 스토어: UI 상태 초기화
 */
export const useMediaCleanup = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);

  /**
   * 방 퇴장 시 모든 미디어 자원 정리
   *
   * 호출 시점:
   * - 사용자가 '나가기' 버튼 클릭 시
   * - 브라우저 탭/창 닫기 시 (beforeunload)
   * - 네트워크 연결 끊김으로 인한 강제 퇴장 시
   *
   * 정리 순서:
   * 1. 모든 Producer 종료 (서버에 close 알림 → 상대방 Consumer도 정리됨)
   * 2. 모든 Consumer 종료 (상대방 미디어 수신 중단)
   * 3. 로컬 미디어 트랙 중지 (카메라/마이크 하드웨어 해제)
   * 4. Transport 및 Device 종료 (WebRTC 연결 정리)
   * 5. Zustand 스토어 초기화 (UI 상태 리셋)
   *
   * Promise.allSettled 사용 이유:
   * - 일부 정리가 실패해도 나머지는 계속 진행해야 함
   * - 퇴장 시에는 에러를 throw하지 않고 로그만 남김
   */
  const cleanupMedia = useCallback(async () => {
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

  return { cleanupMedia };
};
