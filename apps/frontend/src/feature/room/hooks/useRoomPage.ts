import { useEffect, useState } from 'react';
import { VideoDisplayMode } from '../components/ParticipantVideo';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { logger } from '@/shared/lib/logger';

export function useRoomPage() {
  const { isMicOn, isCameraOn, isScreenSharing, initialize, toggleScreenShare } = useMediaStore();
  const { activeDialog, activeSidePanel, setActiveDialog, setActiveSidePanel } = useRoomUIStore();
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
