import { useEffect, useState, type RefObject } from 'react';

import { logger } from '@/shared/lib/logger';
import { VideoDisplayMode } from '@/feature/room/types';

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
    let isDisposed = false;
    const hideOverlay = () => {
      if (!isDisposed) {
        setShowOverlay(false);
      }
    };

    const tryPlay = () => {
      const playResult = videoElement.play();
      if (playResult && typeof playResult.then === 'function') {
        void playResult
          .then(() => {
            hideOverlay();
          })
          .catch((error) => logger.ui.warn('[Video] 재생 실패', error));
        return;
      }
      hideOverlay();
    };

    const onLoadedData = () => {
      tryPlay();
    };

    if (!activeStream || !isVideoEnabled) {
      videoElement.removeEventListener('loadeddata', onLoadedData);
      if (videoElement.srcObject) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      return;
    }

    if (videoElement.srcObject !== activeStream) {
      const tracks = activeStream.getVideoTracks();
      logger.ui.debug(
        `[Video] 연결: 트랙 ${tracks.length}, readyState ${tracks[0]?.readyState ?? 'none'}`,
      );
      videoElement.srcObject = activeStream;
      setShowOverlay(true);
    }

    videoElement.removeEventListener('loadeddata', onLoadedData);
    videoElement.addEventListener('loadeddata', onLoadedData);

    if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      isDisposed = true;
      videoElement.removeEventListener('loadeddata', onLoadedData);
    };
  }, [activeStream, isVideoEnabled, mode, videoRef]);

  return { showOverlay };
}
