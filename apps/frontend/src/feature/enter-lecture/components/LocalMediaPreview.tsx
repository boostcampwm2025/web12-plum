import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Icon } from '@/shared/components/icon/Icon';
import { logger } from '@/shared/lib/logger';
import { cn } from '@/shared/lib/utils';
import { useStreamStore } from '@/store/useLocalStreamStore';

import { ENTER_LECTURE_KEYS } from '../schema';

/**
 * 로컬 스트림(카메라/마이크) 확인 컴포넌트
 * @returns 로컬 스트림 확인 JSX 요소
 */
export function LocalMediaPreview() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useStreamStore((state) => state.localStream);
  const { startStream, stopStream, setTracksEnabled } = useStreamStore((state) => state.actions);

  const { setValue } = useFormContext();
  const isAudioOn = useWatch({ name: ENTER_LECTURE_KEYS.isAudioOn });
  const isVideoOn = useWatch({ name: ENTER_LECTURE_KEYS.isVideoOn });

  useEffect(() => {
    const syncStream = async () => {
      // 둘 다 꺼진 경우 스트림 중지
      if (!isVideoOn && !isAudioOn) {
        stopStream();
        return;
      }

      // 스트림이 이미 있다면 트랙만 조절 (불필요한 재시작 방지)
      if (localStream) {
        setTracksEnabled(isVideoOn, isAudioOn);
        return;
      }

      // 스트림이 없는 경우에만 새로 요청
      try {
        await startStream({ video: true, audio: true });
        // 권한은 둘 다 받아두고, 실제 활성화는 현재 폼 상태에 맞춤
        setTracksEnabled(isVideoOn, isAudioOn);
      } catch (error) {
        logger.media.error('[LocalStreamCheck] 스트림 요청 실패', error);

        // 권한 거부 등으로 스트림 요청에 실패한 경우 토글 상태를 모두 끔으로 변경
        setValue(ENTER_LECTURE_KEYS.isVideoOn, false);
        setValue(ENTER_LECTURE_KEYS.isAudioOn, false);
      }
    };

    syncStream();
  }, [isVideoOn, isAudioOn]);

  // 비디오 소스 연결
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="grid aspect-video max-w-130 flex-1 place-items-center rounded-lg bg-gray-400">
      <video
        ref={localVideoRef}
        autoPlay // 자동 재생
        muted // 자기 목소리 피드백 방지
        playsInline // iOS 사파리에서 전체화면 방지
        className={cn(
          'aspect-video w-full rounded-lg object-cover',
          isVideoOn ? 'opacity-100' : 'absolute inset-0 opacity-0',
        )}
      />

      {!isVideoOn && (
        <div className="flex h-full w-full items-center justify-center">
          <Icon
            name="cam-disabled"
            size={48}
            strokeWidth={2}
            className="text-text"
          />
        </div>
      )}
    </div>
  );
}
