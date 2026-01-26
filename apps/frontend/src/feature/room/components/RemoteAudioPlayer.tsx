import { memo, useEffect, useMemo, useRef } from 'react';
import { useMediaStore } from '../stores/useMediaStore';
import { logger } from '@/shared/lib/logger';

/**
 * 단일 원격 오디오 스트림을 재생하는 컴포넌트
 */
function AudioElement({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    el.srcObject = stream;

    // 브라우저 정책으로 인해 play()가 거부될 수 있으므로 명시적 실행
    const playAudio = async () => {
      try {
        await el.play();
      } catch (error) {
        logger.media.info('오디오 재생 실패 (사용자 인터랙션 필요):', error);
      }
    };

    playAudio();

    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="hidden"
    />
  );
}

const MemoizedAudioElement = memo(AudioElement);

/**
 * 모든 원격 참가자의 오디오 스트림을 자동 재생하는 컴포넌트
 */
export function RemoteAudioPlayer() {
  const remoteStreams = useMediaStore((state) => state.remoteStreams);

  const audioStreams = useMemo(() => {
    const streams = Array.from(remoteStreams.values()).filter((stream) => stream.type === 'audio');
    return streams;
  }, [remoteStreams]);

  if (audioStreams.length === 0) return null;

  return (
    <>
      {audioStreams.map((stream) => (
        <MemoizedAudioElement
          key={stream.consumerId}
          stream={stream.stream}
        />
      ))}
    </>
  );
}
