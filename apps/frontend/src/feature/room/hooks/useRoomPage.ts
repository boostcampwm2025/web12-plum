import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { EnterRoomResponse } from '@plum/shared-interfaces';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { VideoDisplayMode } from '../components/ParticipantVideo';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { logger } from '@/shared/lib/logger';

export function useRoomPage() {
  const location = useLocation();
  const { initDevice } = useMediaDeviceStore((state) => state.actions);
  const { isMicOn, isCameraOn, isScreenSharing, initialize, toggleScreenShare } = useMediaStore();
  const { activeDialog, activeSidePanel, setActiveDialog, setActiveSidePanel } = useRoomUIStore();
  const { setMyInfo } = useRoomStore((state) => state.actions);
  const [userVideoMode, setUserVideoMode] = useState<VideoDisplayMode>('pip');

  // Mock 데이터 (나중에 실제 데이터로 교체)
  const currentUser = { id: 'me', name: '윤자두' };
  const participants = [
    { id: '1', name: '김자두' },
    { id: '2', name: '김자두' },
    { id: '3', name: '이자두' },
    { id: '4', name: '박자두' },
    { id: '5', name: '최자두' },
    { id: '6', name: '정자두' },
  ];

  // 강의실 입장 시 초기 미디어 상태 설정
  useEffect(() => {
    // TODO: 실제로는 사용자가 선택한 초기 상태를 받아와야 함
    initialize(false, false);
  }, [initialize]);

  useEffect(() => {
    const state = location.state as EnterRoomResponse | null;
    if (state?.participantId && state?.name && state?.role) {
      setMyInfo({
        participantId: state.participantId,
        name: state.name,
        role: state.role,
      });
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
