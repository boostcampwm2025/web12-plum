import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { MediaType, ParticipantRole } from '@plum/shared-interfaces';
import { useMediaConnectionContext } from '../hooks/useMediaConnectionContext';
import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '../stores/useMediaStore';
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

/**
 * UI에서 특정 참가자의 비디오 스트림을 실시간으로 구독하기 위한 커스텀 셀렉터 훅
 * remoteStreams는 consumerId를 키로 사용하므로 participantId로 순회 검색
 */
function useRemoteVideoStream(participantId: string): MediaStream | null {
  return useMediaStore((state) => {
    for (const stream of state.remoteStreams.values()) {
      if (stream.participantId === participantId && stream.type === 'video') {
        return stream.stream;
      }
    }
    return null;
  });
}

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
  isActive?: boolean;
  isCurrentlyVisible?: boolean;
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
}

export function ParticipantVideo({
  id,
  name,
  mode,
  isCurrentUser = false,
  onModeChange,
  stream: localStream,
  isCameraOn: localCameraOn = false,
  videoProducerId,
  participantRole,
  isActive = true,
  isCurrentlyVisible = true,
  onVideoElementChange,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { consumeRemoteProducer, stopConsuming } = useMediaConnectionContext();

  // 원격 스트림인 경우에만 스토어에서 비디오 스트림 구독
  const remoteStream = useRemoteVideoStream(isCurrentUser ? '' : id);

  // 최종적으로 화면에 띄울 스트림과 카메라 상태 결정
  const activeStream = isCurrentUser ? localStream : remoteStream;
  const isVideoEnabled = isCurrentUser ? localCameraOn : !!remoteStream;

  /**
   * 비디오 수신 제어 로직
   * - isActive가 true이고 윈도우 내에 마운트되면 미리 수신
   * - 컴포넌트가 언마운트(윈도우 밖으로 제외)될 때 자원을 정리
   */
  useEffect(() => {
    if (isCurrentUser || !videoProducerId || !participantRole) return;
    // 수신 시작 (윈도우 내에 마운트됨)
    if (isActive) {
      logger.ui.debug(`[Network] Consume 시작: ${name} (ID: ${id})`);
      consumeRemoteProducer({
        participantId: id,
        producerId: videoProducerId,
        type: 'video' as MediaType,
        kind: 'video',
        participantRole: participantRole,
      });
    } // 수신 중단 (마운트는 유지되나 윈도우에서 밀려남)
    else {
      logger.ui.debug(`[Network] 수신 중단(InActive): ${name} (ID: ${id})`);
      stopConsuming(videoProducerId, 'video');
    }

    // 언마운트 로그 (DOM에서 완전히 제거됨)
    return () => {
      if (videoProducerId) {
        logger.ui.debug(`[Network] 수신 중단(언마운트): ${name} (ID: ${id})`);
        stopConsuming(videoProducerId, 'video');
      }
    };
  }, [
    isActive,
    id,
    videoProducerId,
    participantRole,
    isCurrentUser,
    consumeRemoteProducer,
    stopConsuming,
  ]);

  // 스트림 연결 처리
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (mode !== 'minimize' && activeStream && isVideoEnabled) {
      if (videoElement.srcObject !== activeStream) {
        logger.ui.debug('[ParticipantVideo] 새로 연결');
        videoElement.srcObject = activeStream;
      }
    } else {
      // 카메라 꺼지면 srcObject 정리 (마지막 프레임 제거)
      if (videoElement.srcObject !== null) videoElement.srcObject = null;
    }
  }, [activeStream, isVideoEnabled, mode]);

  useEffect(() => {
    onVideoElementChange?.(videoRef.current);
    return () => {
      onVideoElementChange?.(null);
    };
  }, [onVideoElementChange, mode]);

  return (
    <motion.div
      layout="position"
      layoutId={isCurrentUser ? `participant-video-${id}` : undefined}
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
        'relative z-50 w-50.5 overflow-hidden rounded-lg',
        isCurrentUser && 'group',
        mode === 'minimize' && 'flex h-9 items-center justify-between bg-gray-500 px-2 shadow-md',
        mode === 'pip' && 'shadow-md',
      )}
    >
      {/* 비디오 영역 */}
      {mode !== 'minimize' &&
        (activeStream && isVideoEnabled ? (
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
