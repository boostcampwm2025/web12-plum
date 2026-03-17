import { useCallback } from 'react';

import { logger } from '@/shared/lib/logger';
import { MediaConnectionService } from '@/shared/mediasoup/mediaConnection.service';
import { useStreamStore } from '@/shared/stores/useLocalStreamStore';

import { useMediaStore } from '../stores/useMediaStore';
import { useBackgroundEffect } from './useBackgroundEffect';

/**
 * 로컬 미디어(카메라, 마이크, 화면공유)의 송출 및 제어를 담당하는 훅
 *
 * 사용자의 미디어 장치를 제어하고 다른 참가자에게 송출하는 기능을 제공
 *
 * ## 주요 역할
 * - 카메라/마이크/화면공유 활성화/비활성화/토글
 * - MediaConnectionService를 통한 서버 송출 관리
 * - Zustand 스토어를 통한 UI 상태 동기화
 *
 * ## 카메라 vs 마이크 차이점
 * - 카메라: 배경 효과 적용 가능, 비활성화 시 하드웨어까지 정지
 * - 마이크: 비활성화 시 Producer만 일시정지 (하드웨어는 유지)
 *
 * ## 화면공유 특수성
 * - 일시정지 불가, 시작/중지만 가능
 * - 브라우저 UI에서 '공유 중지' 클릭 시 자동으로 정리됨
 */
export const useLocalMedia = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);
  const { start: startBackgroundEffect, stop: stopBackgroundEffect } = useBackgroundEffect();

  /**
   * 카메라 활성화
   *
   * 1. 카메라 트랙 확보 (navigator.mediaDevices.getUserMedia)
   * 2. 배경 효과 적용하여 처리된 트랙 생성 (실패 시 원본 사용)
   * 3. 기존 Producer가 있으면 resume, 없으면 새로 생성하여 서버 송출
   * 4. 로컬 트랙 활성화 상태 설정 및 Zustand isCameraOn = true 업데이트
   *
   * @throws 카메라 권한 거부 또는 장치 없음 시 에러 발생 (catch 후 재throw)
   *
   * disableCamera()로 일시정지된 Producer는 여기서 resume됨
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

      // 기존에 유효한 Producer가 존재하는지 확인 (closed 상태가 아닌 경우만)
      const existingProducer = MediaConnectionService.getProducer('video');
      if (existingProducer && !existingProducer.closed) {
        // 기존 Producer가 있으면 트랙을 교체하고 resume
        await MediaConnectionService.replaceTrack('video', trackToSend);
        await MediaConnectionService.toggleProducer('video', false);
      } else {
        // Producer가 없거나 closed 상태면 새로 생성
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
  }, [streamActions, mediaActions, startBackgroundEffect]);

  /**
   * 카메라 비활성화
   *
   * 1. Producer 일시정지 (서버 송출 중지, enableCamera()에서 resume 가능)
   * 2. 배경 효과 정리 (Canvas, Worker 등 메모리 해제)
   * 3. 카메라 하드웨어 정지 (track.stop() → 브라우저 카메라 표시등 꺼짐)
   * 4. Zustand isCameraOn = false 및 로컬 트랙 비활성화
   *
   * 마이크와 달리 하드웨어까지 정지하므로, 다시 켤 때 getUserMedia 재호출 필요
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
   *
   * 현재 isCameraOn 상태를 반전시킴
   * - OFF -> ON: enableCamera() 호출
   * - ON -> OFF: disableCamera() 호출
   *
   * UI 버튼의 onClick 핸들러로 직접 연결하여 사용
   * 비동기 함수이므로 연속 클릭 시 상태 불일치 주의 (버튼 비활성화 필요)
   */
  const toggleCamera = useCallback(async () => {
    const targetState = !useMediaStore.getState().isCameraOn;
    if (targetState) await enableCamera();
    else await disableCamera();
  }, [enableCamera, disableCamera]);

  /**
   * 마이크 활성화
   *
   * 1. 마이크 트랙 확보 (navigator.mediaDevices.getUserMedia)
   * 2. 기존 Producer가 있으면 resume, 없으면 새로 생성하여 서버 송출
   * 3. 로컬 트랙 활성화 상태 설정 및 Zustand isMicOn = true 업데이트
   *
   * @throws 마이크 권한 거부 또는 장치 없음 시 에러 발생 (catch 후 재throw)
   *
   * 카메라와 달리 배경 효과 처리 없음 (오디오는 그대로 송출)
   */
  const enableMic = useCallback(async () => {
    const { isCameraOn } = useMediaStore.getState();

    try {
      const stream = await streamActions.ensureTracks({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];

      // 기존에 Producer가 존재하는지 확인
      const existingProducer = MediaConnectionService.getProducer('audio');
      if (existingProducer) {
        await MediaConnectionService.replaceTrack('audio', audioTrack);
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
   *
   * 1. Producer가 일시정지 상태가 아니면 일시정지 (서버 송출 중지)
   * 2. 로컬 트랙 비활성화 (track.enabled = false)
   * 3. Zustand isMicOn = false 업데이트
   *
   * 카메라와 달리 하드웨어는 정지하지 않음 (track.stop() 호출 안 함)
   *    → 빠른 재활성화 가능, but 브라우저 마이크 표시등은 계속 켜져 있음
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
   *
   * 현재 isMicOn 상태를 반전시킴
   * - OFF -> ON: enableMic() 호출
   * - ON -> OFF: disableMic() 호출
   *
   * UI 버튼의 onClick 핸들러로 직접 연결하여 사용
   * 비동기 함수이므로 연속 클릭 시 상태 불일치 주의 (버튼 비활성화 필요)
   */
  const toggleMic = useCallback(async () => {
    const targetState = !useMediaStore.getState().isMicOn;
    if (targetState) await enableMic();
    else await disableMic();
  }, [enableMic, disableMic]);

  /**
   * 화면 공유 시작
   *
   * 1. 화면 스트림 획득 (navigator.mediaDevices.getDisplayMedia)
   *    → 브라우저 UI에서 사용자가 공유할 화면/창/탭 선택
   * 2. screenTrack.onended 이벤트로 공유 중지 자동 처리 등록
   *    → 브라우저 '공유 중지' 버튼 클릭 시 disableScreenShare() 자동 호출
   * 3. 화면 트랙을 Producer로 생성하여 서버 송출
   * 4. Zustand 상태 업데이트 (screenStream, isScreenSharing = true)
   *
   * @throws 사용자가 공유 취소하거나 권한 거부 시 에러 발생
   *
   * 카메라/마이크와 달리 일시정지 불가 (시작/중지만 가능)
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
   *
   * 1. screenStream의 모든 트랙 stop() 호출 (비디오 + 오디오 트랙 정리)
   * 2. 'screen' 타입 Producer 완전 종료 (stopProducing → 서버에 close 알림)
   * 3. Zustand 상태 초기화 (screenStream = null, isScreenSharing = false)
   *
   * 브라우저 '공유 중지' 버튼 클릭 시에도 이 함수가 자동 호출됨
   *    (enableScreenShare에서 screenTrack.onended에 등록)
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
   *
   * 현재 isScreenSharing 상태를 반전시킴
   * - OFF -> ON: enableScreenShare() 호출 (브라우저 화면 선택 UI 표시)
   * - ON -> OFF: disableScreenShare() 호출
   *
   * UI 버튼의 onClick 핸들러로 직접 연결하여 사용
   * 비동기 함수이므로 연속 클릭 시 상태 불일치 주의 (버튼 비활성화 필요)
   */
  const toggleScreenShare = useCallback(async () => {
    // 현재 상태 반전
    const targetState = !useMediaStore.getState().isScreenSharing;
    if (targetState) await enableScreenShare();
    else await disableScreenShare();
  }, [enableScreenShare, disableScreenShare]);

  /**
   * 초기 미디어 설정 처리
   *
   * 강의실 입장 시 호출하여 기존 설정(isMicOn, isCameraOn)에 따라 미디어를 활성화
   *
   * 사용 시점:
   * - Transport 연결 완료 후 호출
   * - 사용자가 대기실에서 설정한 카메라/마이크 상태를 강의실에서 복원
   *
   * 동작:
   * - isMicOn이 true면 enableMic() 호출
   * - isCameraOn이 true면 enableCamera() 호출
   *
   * 화면공유는 초기화 대상이 아님 (항상 OFF 상태로 시작)
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
