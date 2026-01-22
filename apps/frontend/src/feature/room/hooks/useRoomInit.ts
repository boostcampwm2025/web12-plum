import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { logger } from '@/shared/lib/logger';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useToastStore } from '@/store/useToastStore';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaStore } from '../stores/useMediaStore';
import { useMediaConnectionContext } from './useMediaConnectionContext';
import { RoomSignaling } from '../mediasoup/RoomSignaling';

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

  // URL 파라미터
  const { roomId } = useParams<{ roomId: string }>();

  // 스토어 상태
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const hasHydrated = useMediaStore((state) => state.hasHydrated);
  const myInfo = useRoomStore((state) => state.myInfo);

  // 스토어 액션
  const { initDevice } = useMediaDeviceStore((state) => state.actions);
  const { ensureTracks } = useStreamStore((state) => state.actions);
  const { initParticipants, addParticipant, removeParticipant, addProducer } = useRoomStore(
    (state) => state.actions,
  );
  const { removeRemoteStreamByParticipant } = useMediaStore((state) => state.actions);
  const { connect: connectSocket } = useSocketStore((state) => state.actions);
  const { addToast } = useToastStore((state) => state.actions);

  // 미디어 컨트롤러
  const {
    startProducing,
    consumeRemoteProducer,
    consumeExistingProducers,
    cleanup: cleanupMedia,
  } = useMediaConnectionContext();

  const resolveParticipantName = (participantId: string) => {
    const { participants, myInfo } = useRoomStore.getState();
    const participant = participants.get(participantId);
    if (participant?.name) return participant.name;
    if (myInfo?.id === participantId && myInfo.name) return myInfo.name;
    return '굴러 들어온 자두';
  };

  /**
   * 메인 초기화 파이프라인
   */
  const runInitPipeline = useCallback(async () => {
    try {
      if (!roomId) throw new Error('유효하지 않은 방 ID 입니다.');
      if (!myInfo) throw new Error('내 참가자 정보가 존재하지 않습니다.');

      // 로딩 시작
      setIsLoading(true);
      setError(null);

      // 1. 소켓 연결 및 이벤트 핸들러 등록
      const connectedSocket = await connectSocket();
      if (!connectedSocket) throw new Error('서버 소켓 연결에 실패했습니다.');

      // 2. 실시간 이벤트 핸들러 설정
      RoomSignaling.setupAllHandlers(connectedSocket, {
        addParticipant,
        removeParticipant,
        addProducer,
        consumeRemoteProducer,
        handleMediaStateChanged: (data) => {
          if (data.action === 'pause') {
            removeRemoteStreamByParticipant(data.participantId, data.type);
          }
        },
        handleUpdateGestureStatus: (data) => {
          const name = resolveParticipantName(data.participantId);
          addToast({ type: 'gesture', title: name, gesture: data.gesture });
        },
      });

      // 3. 방 입장 요청
      const routerRtpCapabilities = await RoomSignaling.joinRoom(
        connectedSocket,
        roomId,
        myInfo.id,
        initParticipants,
      );

      // 4. Mediasoup Device 초기화
      await initDevice(routerRtpCapabilities);

      // 5. 기존 참가자들의 오디오와 화면공유 즉시 수신
      await consumeExistingProducers();

      // 6. 미디어 스트림 획득 및 송출 시작
      try {
        // 초기 입장 시 사용자가 설정한 값에 따라 트랙 확보
        if (isCameraOn || isMicOn) {
          logger.custom.info('[RoomInit] 초기 미디어 스트림 확보 시작', { isCameraOn, isMicOn });

          // 사용자의 초기 설정(isCameraOn, isMicOn)에 따라 필요한 트랙 요청
          const stream = await ensureTracks({ video: isCameraOn, audio: isMicOn });

          if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            // 실제 트랙이 존재하고 사용자가 켰을 때만 Producing 시작
            if (isCameraOn && videoTrack) await startProducing(videoTrack, 'video');
            if (isMicOn && audioTrack) await startProducing(audioTrack, 'audio');
          }
        } else {
          logger.custom.info('[RoomInit] 카메라와 마이크가 모두 꺼져 있어 스트림 획득을 건너뜀');
        }
      } catch (streamErr) {
        logger.custom.warn('[RoomInit] 미디어 획득 실패(입장은 유지):', streamErr);
      }

      // 완료
      setIsSuccess(true);
      setIsLoading(false);
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
      const socket = useSocketStore.getState().socket;
      if (socket) RoomSignaling.removeAllHandlers(socket);

      // 미디어 자원 정리
      cleanupMedia();
      logger.custom.info('[RoomInit] 미디어 연결 자원 정리 완료');
    };
  }, []);

  return { isLoading, isSuccess, error, retry };
}
