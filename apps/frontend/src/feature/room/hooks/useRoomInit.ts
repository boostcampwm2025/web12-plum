import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import type { RtpCapabilities } from 'mediasoup-client/types';
import type {
  EnterRoomResponse,
  JoinRoomResponse,
  ServerToClientEvents,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useSocketStore } from '@/store/useSocketStore';

import { MyInfo, useRoomStore } from '../stores/useRoomStore';
import { useMediaStore } from '../stores/useMediaStore';
import { useMediaConnectionContext } from './useMediaConnectionContext';

/**
 * Room 초기화 통합 훅
 * 방 입장부터 미디어 설정, Socket 이벤트 리스닝까지의 초기화 파이프라인을 관리
 */
export function useRoomInit() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 초기화 프로세스가 이미 시작되었는지 여부를 추적
   * 상태 변경으로 인한 리렌더링을 피하고, 즉각적으로 잠금 상태를 반영하기 위함
   */
  const hasStartedInit = useRef(false);

  // 라우터 정보
  const location = useLocation();
  const navState = location.state as EnterRoomResponse | null;

  // 스토어 상태
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const hasHydrated = useMediaStore((state) => state.hasHydrated);

  // 스토어 액션
  const { initDevice } = useMediaDeviceStore((state) => state.actions);
  const { startStream } = useStreamStore((state) => state.actions);
  const { setMyInfo, setRouterRtpCapabilities, addParticipant, removeParticipant } = useRoomStore(
    (state) => state.actions,
  );
  const {
    connect: connectSocket,
    registerHandlers,
    unregisterHandlers,
  } = useSocketStore((state) => state.actions);

  // 미디어 컨트롤러
  const {
    startProducing,
    consumeRemoteProducer,
    cleanup: cleanupMedia,
  } = useMediaConnectionContext();

  // 소켓 이벤트 핸들러 모음
  const socketEventHandlers: Partial<ServerToClientEvents> = {
    user_joined: addParticipant,
    user_left: (data) => removeParticipant(data.id),
    new_producer: consumeRemoteProducer,
  };

  /**
   * 데이터 복원
   */
  const restoreRoomData = useCallback((): { myInfo: MyInfo; rtpCapabilities: RtpCapabilities } => {
    // Navigation State에서 시도
    if (navState?.mediasoup?.routerRtpCapabilities) {
      const { participantId, name, role, mediasoup } = navState;
      const info = { id: participantId, name, role };
      setMyInfo(info);
      setRouterRtpCapabilities(mediasoup.routerRtpCapabilities as RtpCapabilities);

      return { myInfo: info, rtpCapabilities: mediasoup.routerRtpCapabilities as RtpCapabilities };
    }

    // SessionStorage에서 시도
    const storedData = sessionStorage.getItem('room-my-info');
    if (storedData) {
      const { state } = JSON.parse(storedData);
      if (state?.myInfo && state?.routerRtpCapabilities) {
        setMyInfo(state.myInfo);
        setRouterRtpCapabilities(state.routerRtpCapabilities);

        return { myInfo: state.myInfo, rtpCapabilities: state.routerRtpCapabilities };
      }
    }

    throw new Error('복원할 수 있는 방 입장 데이터가 없습니다.');
  }, [navState]);

  /**
   * 메인 초기화 파이프라인
   */
  const runInitPipeline = useCallback(async () => {
    try {
      // 로딩 시작
      setIsLoading(true);
      setError(null);

      // 1. 소켓 연결 및 이벤트 핸들러 등록
      const connectedSocket = await connectSocket();
      if (!connectedSocket) throw new Error('서버 소켓 연결에 실패했습니다.');
      registerHandlers(socketEventHandlers);

      // 2. 데이터 복원 및 Mediasoup Device 초기화
      const { myInfo, rtpCapabilities } = restoreRoomData();
      await initDevice(rtpCapabilities);

      // 3. 방 입장 요청
      const roomId = window.location.pathname.split('/').pop() || '';
      await new Promise<void>((resolve, reject) => {
        const payload = { roomId, participantId: myInfo.id };
        const handleResponse = (response: JoinRoomResponse) => {
          if (response.success) resolve();
          else reject(new Error(response.error || '방 입장 실패'));
        };

        connectedSocket.emit('join_room', payload, handleResponse);
      });

      // 4. 미디어 스트림 획득 및 송출 시작
      try {
        const stream = await startStream({ video: isCameraOn, audio: isMicOn });
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          if (isCameraOn && videoTrack) await startProducing(videoTrack, 'video');
          if (isMicOn && audioTrack) await startProducing(audioTrack, 'audio');
        }
      } catch (streamErr) {
        logger.custom.warn('[RoomInit] 미디어 획득 실패(입장은 유지):', streamErr);
      }

      // 완료
      setIsSuccess(true);
      logger.custom.info('[RoomInit] 모든 초기화 시퀀스 완료');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('알 수 없는 초기화 실패');
      logger.custom.error('[RoomInit] 에러 발생:', errorObj);
      setError(errorObj);
      hasStartedInit.current = false;
    }
  }, [isCameraOn, isMicOn]);

  /**
   * 재시도 핸들러
   */
  const retry = useCallback(() => {
    hasStartedInit.current = false;
    setIsSuccess(false);
    setError(null);
  }, []);

  /**
   * 초기화 트리거
   */
  useEffect(() => {
    // 이미 완료되었거나 Hydration 전이면 대기
    const shouldWait = hasStartedInit.current || !hasHydrated || isSuccess || isLoading;
    if (shouldWait) return;

    hasStartedInit.current = true;
    runInitPipeline();
  }, [hasHydrated, isSuccess, isLoading, runInitPipeline]);

  /**
   * 훅 언마운트 시 자동 정리
   */
  useEffect(() => {
    return () => {
      // 소켓 이벤트 핸들러 해제
      const eventNames = Object.keys(socketEventHandlers) as (keyof ServerToClientEvents)[];
      unregisterHandlers(eventNames);
      logger.custom.info('[RoomInit] 소켓 리스너 해제 완료');

      // 미디어 자원 정리
      cleanupMedia();
      logger.custom.info('[RoomInit] 미디어 연결 자원 정리 완료');
    };
  }, [unregisterHandlers]);

  return { isLoading, isSuccess, error, retry };
}
