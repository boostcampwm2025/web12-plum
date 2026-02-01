import { useCallback } from 'react';

import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';
import { logger } from '@/shared/lib/logger';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaStore } from '@/feature/room/stores/useMediaStore';
import { useBackgroundEffect } from './useBackgroundEffect';

/**
 * 로컬 미디어(카메라, 마이크, 화면공유)의 송출 및 제어를 담당하는 훅
 */
export const useLocalMedia = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);
  const { start: startBackgroundEffect, stop: stopBackgroundEffect } = useBackgroundEffect();

  /**
   * 카메라 활성화
   * - 카메라 트랙 확보 (navigator.mediaDevices.getUserMedia)
   * - 배경 효과 적용하여 처리된 트랙 생성 (fallback: 원본)
   * - 기존 Producer 재개 또는 신규 Producer 생성하여 서버 송출
   * - 로컬 트랙 활성화 상태 설정
   * - Zustand isCameraOn 상태 true로 업데이트
   */
  const enableCamera = useCallback(async () => {
    const { isMicOn } = useMediaStore.getState();

    try {
      // 카메라 트랙 확보
      const stream = await streamActions.ensureTracks({ video: true });
      const videoTrack = stream.getVideoTracks()[0];

      // 배경 효과 처리된 트랙 준비 후 produce (다른 참가자에게 원본이 노출되지 않도록)
      const processedTrack = await startBackgroundEffect(videoTrack);
      const trackToSend = processedTrack ?? videoTrack;

      // 기존에 Producer가 존재하는지 확인
      const existingProducer = MediaConnectionService.getProducer('video');
      if (existingProducer) {
        await MediaConnectionService.toggleProducer('video', false);
      } else {
        await MediaConnectionService.startProducing(trackToSend, 'video');
      }

      // 미디어 송출 시작
      streamActions.setTracksEnabled(true, isMicOn);
      mediaActions.setCameraOn(true);

      logger.media.info('[useLocalMedia] 카메라 활성화 성공');
    } catch (error) {
      logger.media.error('[useLocalMedia] 카메라 활성화 실패', error);
      throw error;
    }
  }, [streamActions, mediaActions, startBackgroundEffect, stopBackgroundEffect]);

  /**
   * 카메라 비활성화
   * - Producer 일시정지 (서버 송출 중지, enableCamera에서 resume 가능)
   * - 배경 효과 정리 (메모리 해제)
   * - 카메라 하드웨어 정지 (navigator.mediaDevices 트랙 중지)
   * - Zustand isCameraOn = false 및 로컬 트랙 비활성화
   */
  const disableCamera = useCallback(async () => {
    try {
      // 미디어 송출 중지
      await MediaConnectionService.toggleProducer('video', true);

      // 배경 효과 정리
      stopBackgroundEffect();
      streamActions.stopTrack('video');
      mediaActions.setCameraOn(false);

      logger.media.info('[useLocalMedia] 카메라 비활성화 성공');
    } catch (error) {
      logger.media.error('[useLocalMedia] 카메라 비활성화 실패', error);
      throw error;
    }
  }, [streamActions, mediaActions, stopBackgroundEffect]);

  /**
   * 카메라 토글
   * - isCameraOn 상태 반전
   * - true: enableCamera() 호출
   * - false: disableCamera() 호출
   */
  const toggleCamera = useCallback(async () => {
    const targetState = !useMediaStore.getState().isCameraOn;
    if (targetState) await enableCamera();
    else await disableCamera();
  }, [enableCamera, disableCamera]);

  /**
   * 마이크 활성화
   * - 마이크 트랙 확보 (navigator.mediaDevices.getUserMedia)
   * - 기존 Producer 재개 또는 신규 Producer 생성하여 서버 송출
   * - 로컬 트랙 활성화 상태 설정
   * - Zustand isMicOn = true 업데이트
   */
  const enableMic = useCallback(async () => {
    const { isCameraOn } = useMediaStore.getState();

    try {
      const stream = await streamActions.ensureTracks({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];

      // 기존에 Producer가 존재하는지 확인
      const existingProducer = MediaConnectionService.getProducer('audio');
      if (existingProducer) {
        await MediaConnectionService.toggleProducer('audio', false);
      } else {
        await MediaConnectionService.startProducing(audioTrack, 'audio');
      }

      // 미디어 송출 시작
      streamActions.setTracksEnabled(isCameraOn, true);
      mediaActions.setMicOn(true);

      logger.media.info('[useLocalMedia] 마이크 활성화 성공');
    } catch (error) {
      logger.media.error('[useLocalMedia] 마이크 활성화 실패', error);
      throw error;
    }
  }, [streamActions, mediaActions]);

  /**
   * 마이크 비활성화
   * - Producer 일시정지 상태가 아니면 일시정지
   * - 로컬 트랙 비활성화
   * - Zustand isMicOn = false 업데이트
   */
  const disableMic = useCallback(async () => {
    try {
      const { isCameraOn } = useMediaStore.getState();

      // producer가 일시정지 상태가 아니라면 일시정지
      const producer = MediaConnectionService.getProducer('audio');
      if (producer && !producer.paused) {
        await MediaConnectionService.toggleProducer('audio', true);
      }

      // 로컬 트랙 비활성화
      streamActions.setTracksEnabled(isCameraOn, false);
      mediaActions.setMicOn(false);

      logger.media.info('[useLocalMedia] 마이크 비활성화 성공');
    } catch (error) {
      logger.media.error('[useLocalMedia] 마이크 비활성화 실패', error);
      throw error;
    }
  }, [streamActions, mediaActions]);

  /**
   * 마이크 토글
   * - isMicOn 상태 반전
   * - true: enableMic() 호출
   * - false: disableMic() 호출
   */
  const toggleMic = useCallback(async () => {
    const targetState = !useMediaStore.getState().isMicOn;
    if (targetState) await enableMic();
    else await disableMic();
  }, [enableMic, disableMic]);

  /**
   * 화면 공유 시작
   * - 화면 스트림 획득 (navigator.mediaDevices.getDisplayMedia)
   * - screenTrack.onended 이벤트로 공유 중지 자동 처리 등록
   * - 화면 트랙을 Producer로 생성하여 서버 송출
   * - Zustand 상태 업데이트 (screenStream, isScreenSharing)
   */
  const enableScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const screenTrack = stream.getVideoTracks()[0];

      // 사용자가 브라우저 UI에서 '공유 중지'를 눌렀을 때의 처리
      screenTrack.onended = disableScreenShare;

      // 미디어 송출 시작
      await MediaConnectionService.startProducing(screenTrack, 'screen');
      mediaActions.setScreenStream(stream);
      mediaActions.setScreenSharing(true);
      logger.media.info('[useLocalMedia] 화면 공유 시작');
    } catch (error) {
      logger.media.error('[useLocalMedia] 화면 공유 시작 실패', error);
      throw error;
    }
  }, [mediaActions]);

  /**
   * 화면 공유 중지
   * - screenStream 트랙들 모두 stop() 호출 (하드웨어 해제)
   * - 'screen' 타입 Producer 완전 종료 (stopProducing)
   * - Zustand 상태 초기화 (screenStream = null, isScreenSharing = false)
   */
  const disableScreenShare = useCallback(async () => {
    try {
      // 화면 공유 트랙 정리
      const { screenStream } = useMediaStore.getState();
      screenStream?.getTracks().forEach((track) => track.stop());

      // 미디어 송출 중지
      await MediaConnectionService.stopProducing('screen');
      mediaActions.setScreenStream(null);
      mediaActions.setScreenSharing(false);
      logger.media.info('[useLocalMedia] 화면 공유 중지 성공');
    } catch (error) {
      logger.media.error('[useLocalMedia] 화면 공유 중지 실패', error);
      throw error;
    }
  }, [mediaActions]);

  /**
   * 화면 공유 토글
   * - isScreenSharing 상태 반전
   * - true → enableScreenShare() 호출
   * - false → disableScreenShare() 호출
   */
  const toggleScreenShare = useCallback(async () => {
    // 현재 상태 반전
    const targetState = !useMediaStore.getState().isScreenSharing;
    if (targetState) await enableScreenShare();
    else await disableScreenShare();
  }, [enableScreenShare, disableScreenShare]);

  /**
   * 초기 미디어 설정 처리
   * - 강의실 입장 시 기존 설정에 따라 카메라/마이크 활성화
   */
  const handleInitialMedia = useCallback(async () => {
    const { isMicOn, isCameraOn } = useMediaStore.getState();

    if (isMicOn) await enableMic();
    if (isCameraOn) await enableCamera();
  }, [enableMic, enableCamera]);

  return {
    enableCamera,
    disableCamera,
    toggleCamera,
    enableMic,
    disableMic,
    toggleMic,
    enableScreenShare,
    disableScreenShare,
    toggleScreenShare,
    handleInitialMedia,
  };
};
