import { useState, useCallback } from 'react';
import type { Dialog, SidePanel, MediaState } from '../types';

interface UseRoomMenuBarOptions {
  onMediaStateChange?: (state: MediaState) => void;
  onDialogChange?: (Dialog: Dialog | null) => void;
  onSidePanelChange?: (panel: SidePanel | null) => void;
  initialMediaState?: Partial<MediaState>;
}

export function useRoomMenuBar(options: UseRoomMenuBarOptions = {}) {
  const { onMediaStateChange, onDialogChange, onSidePanelChange, initialMediaState = {} } = options;

  const [mediaState, setMediaState] = useState<MediaState>({
    isMicOn: initialMediaState.isMicOn ?? false,
    isCameraOn: initialMediaState.isCameraOn ?? false,
    isScreenSharing: initialMediaState.isScreenSharing ?? false,
  });

  const [activeDialog, setActiveDialog] = useState<Dialog | null>(null);
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanel | null>(null);
  const handleMicToggle = useCallback(() => {
    setMediaState((prev) => {
      const next = { ...prev, isMicOn: !prev.isMicOn };
      onMediaStateChange?.(next);
      return next;
    });
  }, [onMediaStateChange]);

  const handleCameraToggle = useCallback(() => {
    setMediaState((prev) => {
      const next = { ...prev, isCameraOn: !prev.isCameraOn };
      onMediaStateChange?.(next);
      return next;
    });
  }, [onMediaStateChange]);

  const handleScreenShareToggle = useCallback(() => {
    setMediaState((prev) => {
      const next = { ...prev, isScreenSharing: !prev.isScreenSharing };
      onMediaStateChange?.(next);
      return next;
    });
  }, [onMediaStateChange]);

  const handleDialogChange = useCallback(
    (Dialog: Dialog | null) => {
      setActiveDialog(Dialog);
      onDialogChange?.(Dialog);
    },
    [onDialogChange],
  );

  const handleSidePanelChange = useCallback(
    (panel: SidePanel | null) => {
      setActiveSidePanel(panel);
      onSidePanelChange?.(panel);
    },
    [onSidePanelChange],
  );

  return {
    isMicOn: mediaState.isMicOn,
    isCameraOn: mediaState.isCameraOn,
    isScreenSharing: mediaState.isScreenSharing,
    activeDialog,
    activeSidePanel,
    onMicToggle: handleMicToggle,
    onCameraToggle: handleCameraToggle,
    onScreenShareToggle: handleScreenShareToggle,
    onDialogChange: handleDialogChange,
    onSidePanelChange: handleSidePanelChange,
  };
}
