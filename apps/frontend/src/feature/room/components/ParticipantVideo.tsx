import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { MediaType, ParticipantRole } from '@plum/shared-interfaces';
import { useMediaConnectionContext } from '../hooks/useMediaConnectionContext';

export type VideoDisplayMode = 'minimize' | 'pip' | 'side';

const VIDEO_HEIGHTS = {
  MINIMIZED: 36,
  NORMAL: 114,
};

export interface ParticipantVideoProps {
  id: string;
  name: string;
  mode: VideoDisplayMode;
  isCurrentUser?: boolean;
  onModeChange?: (mode: VideoDisplayMode) => void;
  stream?: MediaStream | null;
  isCameraOn?: boolean;
  videoProducerId?: string;
  participantRole?: ParticipantRole;
}

export function ParticipantVideo({
  id,
  name,
  mode,
  isCurrentUser = false,
  onModeChange,
  stream,
  isCameraOn = false,
  videoProducerId,
  participantRole,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { consumeRemoteProducer, stopConsuming } = useMediaConnectionContext();

  // 화면에 마운트될 때만 비디오 수신 요청
  useEffect(() => {
    if (isCurrentUser || !videoProducerId || !participantRole) return;
    consumeRemoteProducer({
      participantId: id,
      producerId: videoProducerId,
      type: 'video' as MediaType,
      kind: 'video',
      participantRole: participantRole,
    });

    // 언마운트(페이지 이동 등) 시 수신 중단
    return () => {
      stopConsuming(videoProducerId, 'video');
    };
  }, [id, videoProducerId, participantRole, isCurrentUser, consumeRemoteProducer, stopConsuming]);

  // 스트림 연결 처리
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (mode !== 'minimize' && stream && isCameraOn) {
      videoElement.srcObject = stream;
    } else {
      // 카메라 꺼지면 srcObject 정리 (마지막 프레임 제거)
      videoElement.srcObject = null;
    }
  }, [isCameraOn, stream, mode]);

  return (
    <motion.div
      layout="position"
      layoutId={isCurrentUser ? `participant-video-${id}` : undefined}
      animate={{
        height: mode === 'minimize' ? VIDEO_HEIGHTS.MINIMIZED : VIDEO_HEIGHTS.NORMAL,
      }}
      transition={{
        layout: {
          duration: 0.3,
          ease: 'easeInOut',
        },
      }}
      className={cn(
        'relative z-50 w-50.5 overflow-hidden rounded-lg',
        isCurrentUser && 'group',
        mode === 'minimize' && 'flex h-9 items-center justify-between bg-gray-500 px-2 shadow-md',
        mode === 'pip' && 'shadow-md',
      )}
    >
      {/* 비디오 영역 */}
      {mode !== 'minimize' &&
        (stream && isCameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            muted={isCurrentUser}
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <Icon
              name="cam-disabled"
              size={32}
              className="text-text"
            />
          </div>
        ))}

      {/* 이름 표시 */}
      <div className="absolute bottom-2 left-2 rounded px-1 text-sm text-white">{name}</div>

      {/* minimize 모드 확대 버튼 */}
      {mode === 'minimize' && isCurrentUser && (
        <Button
          variant="icon"
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => onModeChange?.('pip')}
          aria-label="확대"
        >
          <Icon
            name="maximize"
            size={16}
          />
        </Button>
      )}

      {/* 호버 컨트롤 (pip, side 모드) */}
      {mode !== 'minimize' && isCurrentUser && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'absolute inset-0 bg-gray-700/40',
            'pointer-events-none group-hover:pointer-events-auto',
          )}
        >
          {mode === 'pip' && (
            <>
              <Button
                variant="icon"
                className="absolute top-2 left-2"
                onClick={() => onModeChange?.('minimize')}
                aria-label="최소화"
              >
                <Icon
                  name="minimize"
                  size={20}
                />
              </Button>
              <Button
                variant="icon"
                className="absolute top-2 right-2"
                onClick={() => onModeChange?.('side')}
                aria-label="사이드바로 이동"
              >
                <Icon
                  name="side-open"
                  size={20}
                />
              </Button>
            </>
          )}

          {mode === 'side' && (
            <Button
              variant="icon"
              className="absolute top-2 right-2"
              onClick={() => onModeChange?.('pip')}
              aria-label="PIP 모드로 전환"
            >
              <Icon
                name="pip"
                size={20}
              />
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
