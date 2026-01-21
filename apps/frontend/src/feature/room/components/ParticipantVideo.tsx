import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { useGestureStore } from '../stores/useGestureStore';
import { GESTURE_ICON_MAP } from '@/shared/constants/gesture';

export type VideoDisplayMode = 'minimize' | 'pip' | 'side';

function GestureProgressOverlay() {
  const gestureProgress = useGestureStore((state) => state.gestureProgress);
  const gesture = gestureProgress.gesture;
  const progress = gestureProgress.progress;

  if (!gesture || progress <= 0) {
    return null;
  }

  const gestureIconName = GESTURE_ICON_MAP[gesture] ?? null;
  const progressRatio = Math.min(1, Math.max(0, progress));
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <div className="pointer-events-none absolute right-2 bottom-2">
      <div className="flex items-center gap-2 rounded-full bg-gray-700/80 p-2">
        {gestureIconName && (
          <div className="relative inline-flex items-center justify-center">
            <Icon
              name={gestureIconName}
              size={24}
              className="fill-current text-white/50"
              decorative
            />
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: `inset(0 ${100 - progressPercent}% 0 0)` }}
              transition={{
                duration: 0.2,
                ease: 'linear',
              }}
            >
              <Icon
                name={gestureIconName}
                size={24}
                className="text-primary fill-current"
                decorative
              />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
}

export function ParticipantVideo({
  id,
  name,
  mode,
  isCurrentUser = false,
  onModeChange,
  stream,
  isCameraOn = true,
  onVideoElementChange,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (mode !== 'minimize' && stream && isCameraOn) {
      videoRef.current.srcObject = stream;
    } else {
      // 카메라 꺼지면 srcObject 정리 (마지막 프레임 제거)
      videoRef.current.srcObject = null;
    }
  }, [isCameraOn, stream, mode]);

  useEffect(() => {
    onVideoElementChange?.(videoRef.current);
    return () => {
      onVideoElementChange?.(null);
    };
  }, [onVideoElementChange, mode, stream, isCameraOn]);

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

      {/* 제스처 인식 프로그레스바 */}
      {mode !== 'minimize' && isCurrentUser && <GestureProgressOverlay />}

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
