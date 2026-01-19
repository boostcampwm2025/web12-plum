import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { EnterRoomResponse } from '@plum/shared-interfaces';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { VideoDisplayMode } from '../components/ParticipantVideo';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { logger } from '@/shared/lib/logger';

export function useRoom() {
  const location = useLocation();
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const hasHydrated = useMediaStore((state) => state.hasHydrated);

  const { initDevice } = useMediaDeviceStore((state) => state.actions);
  const { initialize, toggleScreenShare } = useMediaStore((state) => state.actions);
  const { activeDialog, activeSidePanel, setActiveDialog, setActiveSidePanel } = useRoomUIStore();
  const myInfo = useRoomStore((state) => state.myInfo);
  const { setMyInfo } = useRoomStore((state) => state.actions);
  const localStream = useStreamStore((state) => state.localStream);
  const { startStream, stopStream, setTracksEnabled } = useStreamStore((state) => state.actions);
  const [userVideoMode, setUserVideoMode] = useState<VideoDisplayMode>('pip');

  const currentUser = myInfo ?? { id: '', name: '' };
  // Mock 데이터 (나중에 실제 데이터로 교체)
  const participants = [
    { id: '1', name: '김자두' },
    { id: '2', name: '김자두' },
    { id: '3', name: '이자두' },
    { id: '4', name: '박자두' },
    { id: '5', name: '최자두' },
    { id: '6', name: '정자두' },
  ];

  useEffect(() => {
    const state = location.state as EnterRoomResponse | null;
    if (state?.participantId && state?.name && state?.role) {
      const nextMyInfo = {
        id: state.participantId,
        name: state.name,
        role: state.role,
      };
      setMyInfo(nextMyInfo);
    }

    // 입장 응답에 있으면 세션에 저장해서 새로고침 이후에도 재사용
    const stateCapabilities = state?.mediasoup?.routerRtpCapabilities as
      | RtpCapabilities
      | undefined;
    if (stateCapabilities) {
      sessionStorage.setItem('routerRtpCapabilities', JSON.stringify(stateCapabilities));
    }

    // state가 없을 때(새로고침)는 세션에 저장된 값으로 복구
    const storedCapabilities = sessionStorage.getItem('routerRtpCapabilities');
    const routerRtpCapabilities =
      stateCapabilities ??
      (storedCapabilities ? (JSON.parse(storedCapabilities) as RtpCapabilities) : undefined);
    if (!routerRtpCapabilities) {
      logger.media.warn('routerRtpCapabilities가 없어 Device 초기화 불가');
      return;
    }

    initDevice(routerRtpCapabilities).catch((error) => {
      logger.media.error('Mediasoup Device 초기화 실패:', error);
    });
  }, [initDevice, location.state, setMyInfo]);

  // 미디어 상태 변경 감지 (WebRTC 등과 연동)
  useEffect(() => {
    logger.socket.info('미디어 상태 변경:', { isMicOn, isCameraOn, isScreenSharing });
    // TODO: WebRTC 연동
  }, [isMicOn, isCameraOn, isScreenSharing]);

  useEffect(() => {
    if (!hasHydrated) return;

    const syncStream = async () => {
      const shouldHaveStream = isCameraOn || isMicOn;

      if (!shouldHaveStream) {
        stopStream();
        return;
      }

      if (localStream) {
        const currentVideoEnabled = localStream.getVideoTracks().some((track) => track.enabled);
        const currentAudioEnabled = localStream.getAudioTracks().some((track) => track.enabled);

        if (currentVideoEnabled !== isCameraOn || currentAudioEnabled !== isMicOn) {
          setTracksEnabled(isCameraOn, isMicOn);
        }
        return;
      }

      try {
        await startStream({ video: true, audio: true });
        setTracksEnabled(isCameraOn, isMicOn);
      } catch (error) {
        logger.media.error('로컬 스트림 요청 실패', error);
        initialize(false, false);
      }
    };

    syncStream();
  }, [
    hasHydrated,
    isCameraOn,
    isMicOn,
    initialize,
    localStream,
    setTracksEnabled,
    startStream,
    stopStream,
  ]);

  const handleExit = () => {
    logger.ui.debug('강의실 나가기 요청');
    // TODO: 방 나가기 로직
  };

  const handleStopScreenShare = () => {
    logger.ui.debug('화면 공유 중지 요청');
    toggleScreenShare();
    // TODO: 화면 공유 중지 로직
  };

  return {
    activeDialog,
    activeSidePanel,
    currentUser,
    handleExit,
    handleStopScreenShare,
    participants,
    setActiveDialog,
    setActiveSidePanel,
    userVideoMode,
    setUserVideoMode,
    isScreenSharing,
  };
}
