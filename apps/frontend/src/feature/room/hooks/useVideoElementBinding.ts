import { useEffect, useState, type RefObject } from 'react';

import { logger } from '@/shared/lib/logger';

import type { VideoDisplayMode } from '../components/ParticipantVideo';

interface UseVideoElementBindingParams {
  videoRef: RefObject<HTMLVideoElement>;
  mode: VideoDisplayMode;
  activeStream?: MediaStream | null;
  isVideoEnabled: boolean;
}

export function useVideoElementBinding({
  videoRef,
  mode,
  activeStream,
  isVideoEnabled,
}: UseVideoElementBindingParams) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    setShowOverlay(true);
  }, [activeStream]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || mode === 'minimize') return;

    if (!activeStream || !isVideoEnabled) {
      if (videoElement.srcObject) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      return;
    }

    if (videoElement.srcObject !== activeStream) {
      const tracks = activeStream.getVideoTracks();

      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        logger.ui.debug(`[Video] 연결: 트랙 ${tracks.length}, readyState ${tracks[0].readyState}`);
        videoElement.srcObject = activeStream;

        const handleLoadedData = () => {
          videoElement.removeEventListener('loadeddata', handleLoadedData);
          videoElement.play().catch((error) => logger.ui.warn('[Video] 재생 실패', error));
          setShowOverlay(false);
        };
        videoElement.addEventListener('loadeddata', handleLoadedData);
      }
    }
  }, [activeStream, isVideoEnabled, mode, videoRef]);

  return { showOverlay };
}
