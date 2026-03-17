import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { EnterLectureRequestBody } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useStreamStore } from '@/shared/stores/useLocalStreamStore';
import { useBackgroundEffect } from '@/feature/media/hooks/useBackgroundEffect';
import { useBackgroundEffectStore } from '@/feature/media/stores/useBackgroundEffectStore';

import { ENTER_LECTURE_KEYS } from '../schema';

/**
 * 강의실 입장 화면에서 로컬 미디어 스트림을 폼 상태/배경 효과와 동기화하는 훅
 *
 * - 폼의 마이크/카메라 토글 값을 기준으로 스트림 시작/중지 및 오디오/비디오 트랙 활성화 제어
 * - 비디오가 켜진 경우에만 배경 효과를 시작하고, 꺼지거나 트랙이 없으면 배경 효과를 중지
 * - 배경 효과 적용 스트림이 있으면 우선 사용하고, 없으면 원본 스트림을 video 엘리먼트에 연결
 * - 권한 거부 등으로 스트림 요청에 실패하면 폼 토글 값을 자동으로 false로 되돌려 일관성 유지
 */
export function useLocalMediaController() {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // 스트림 스토어
  const localStream = useStreamStore((state) => state.localStream);
  const { ensureTracks, clearStream, setTracksEnabled } = useStreamStore((state) => state.actions);

  // 배경 효과 스토어
  const processedStream = useBackgroundEffectStore((state) => state.processedStream);
  const { start: startBackgroundEffect, stop: stopBackgroundEffect } = useBackgroundEffect();

  // 폼 상태
  const { setValue } = useFormContext<EnterLectureRequestBody>();
  const isAudioOn = useWatch({ name: ENTER_LECTURE_KEYS.isAudioOn });
  const isVideoOn = useWatch({ name: ENTER_LECTURE_KEYS.isVideoOn });

  /**
   * 폼 토글 상태에 따라 로컬 스트림 생성/정리 및 트랙 활성화 동기화
   */
  useEffect(() => {
    const syncStream = async () => {
      // 둘 다 꺼진 경우 스트림 중지
      if (!isVideoOn && !isAudioOn) {
        clearStream();
        return;
      }

      // 스트림이 이미 있다면 트랙만 조절 (불필요한 재시작 방지)
      if (localStream) {
        setTracksEnabled(isVideoOn, isAudioOn);
        return;
      }

      // 스트림이 없는 경우에만 새로 요청
      try {
        // 권한은 둘 다 받아두고, 실제 활성화는 현재 폼 상태에 맞춤
        await ensureTracks({ video: true, audio: true });
        setTracksEnabled(isVideoOn, isAudioOn);
      } catch (error) {
        logger.media.error('[useLocalMediaController] 스트림 요청 실패', error);

        // 권한 거부 등으로 스트림 요청에 실패한 경우 토글 상태를 모두 끔으로 변경
        setValue(ENTER_LECTURE_KEYS.isVideoOn, false);
        setValue(ENTER_LECTURE_KEYS.isAudioOn, false);
      }
    };

    syncStream();
  }, [isVideoOn, isAudioOn, ensureTracks, clearStream, setTracksEnabled, setValue]);

  /**
   * 비디오가 켜져 있고 로컬 비디오 트랙이 있을 때만 배경 효과를 적용
   * 그 외에는 배경 효과 중지
   */
  useEffect(() => {
    // 비디오가 켜졌지만 스트림이나 트랙이 없는 경우 배경 효과 중지
    if (!isVideoOn || !localStream) {
      stopBackgroundEffect();
      return;
    }

    // 비디오 트랙이 없는 경우 배경 효과 중지
    const [videoTrack] = localStream.getVideoTracks();
    if (!videoTrack) {
      stopBackgroundEffect();
      return;
    }

    startBackgroundEffect(videoTrack).catch((error) => {
      logger.media.warn('[useLocalMediaController] 배경 효과 시작 실패', error);
    });
  }, [isVideoOn, localStream, startBackgroundEffect, stopBackgroundEffect]);

  /**
   * 배경 효과 적용 스트림이 있으면 우선 연결, 없으면 원본 스트림을 video 요소에 연결
   * 스트림이 바뀔 때마다 srcObject를 업데이트하여 항상 최신 스트림이 표시되도록 함
   */
  useEffect(() => {
    const displayStream = processedStream ?? localStream;
    if (!localVideoRef.current || !displayStream) return;

    localVideoRef.current.srcObject = displayStream;
  }, [localStream, processedStream]);

  return {
    isAudioOn,
    isVideoOn,
    localVideoRef,
  };
}
