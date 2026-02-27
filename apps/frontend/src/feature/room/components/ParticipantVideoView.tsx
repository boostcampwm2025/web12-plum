import type { RefObject } from 'react';
import { motion } from 'motion/react';

import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { GESTURE_ICON_MAP } from '@/shared/constants/gesture';

import { useGestureStore } from '../stores/useGestureStore';
import type { VideoDisplayMode } from '../types';

const VIDEO_HEIGHTS = {
  MINIMIZED: 36,
  NORMAL: 114,
};

interface ParticipantVideoViewProps {
  id: string;
  name: string;
  mode: VideoDisplayMode;
  isCurrentUser: boolean;
  onModeChange?: (mode: VideoDisplayMode) => void;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  isCurrentlyVisible: boolean;
  isSpeaking: boolean;
  showOverlay: boolean;
  videoRef: RefObject<HTMLVideoElement>;
}

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

export function ParticipantVideoView({
  id,
  name,
  mode,
  isCurrentUser,
  onModeChange,
  isAudioMuted,
  isVideoEnabled,
  isCurrentlyVisible,
  isSpeaking,
  showOverlay,
  videoRef,
}: ParticipantVideoViewProps) {
  return (
    <motion.div
      layout="position"
      layoutId={isCurrentUser ? `participant-video-${id}` : undefined}
      data-guide={isCurrentUser ? 'cam-layout' : undefined}
      animate={{
        height: mode === 'minimize' ? VIDEO_HEIGHTS.MINIMIZED : VIDEO_HEIGHTS.NORMAL,
      }}
      style={{ display: isCurrentlyVisible ? 'block' : 'none' }}
      transition={{
        layout: {
          duration: 0.3,
          ease: 'easeInOut',
        },
      }}
      className={cn(
        'relative z-25 m-0.5 w-50.5 overflow-hidden rounded-lg',
        isCurrentUser && 'group',
        mode === 'minimize' && 'flex h-9 items-center justify-between bg-gray-500 px-2 shadow-md',
        mode === 'pip' && 'shadow-md',
        isSpeaking && 'ring-success ring-2',
      )}
    >
      {mode !== 'minimize' && (
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            autoPlay
            muted={true}
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />

          {(showOverlay || !isVideoEnabled) && (
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-200 to-gray-300 transition-all duration-300">
              {showOverlay && isVideoEnabled ? (
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-4 border-t-transparent" />
              ) : (
                <Icon
                  name="cam-disabled"
                  size={32}
                  className="text-text"
                />
              )}
            </div>
          )}
        </div>
      )}

      {mode !== 'minimize' && isCurrentUser && <GestureProgressOverlay />}

      <div
        className={cn(
          'text-text absolute bottom-2 left-2 flex items-center gap-1 rounded px-1 text-xs',
          mode !== 'minimize' && 'bg-gray-700/40 py-1',
        )}
      >
        {isAudioMuted && (
          <Icon
            name="mic-disabled"
            size={12}
            className="text-error"
            decorative
          />
        )}
        {name}
      </div>

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
