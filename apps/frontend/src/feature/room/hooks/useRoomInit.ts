import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/shared/lib/logger';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useToastStore } from '@/store/useToastStore';
import { useMediaInfra } from '@/mediasoup/useMediaInfra';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';

import { InteractionSignaling } from '../mediasoup/InteractionSignaling';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { MediaRoomManager } from '../mediasoup/MediaRoomManager';
import { useMediaControlContext } from './useMediaControlContext';

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

  /**
   * MediaRoomManager 인스턴스 참조
   */
  const roomManagerRef = useRef<MediaRoomManager | null>(null);

  const roomId = useSafeRoomId();
  const infra = useMediaInfra();
  const controls = useMediaControlContext();

  // 전역 상태
  const hasHydrated = useMediaStore((state) => state.hasHydrated);
  const roomActions = useRoomStore((state) => state.actions);
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);
  const socketActions = useSocketStore((state) => state.actions);
  const pollActions = usePollStore((state) => state.actions);
  const qnaActions = useQnaStore((state) => state.actions);
  const { addToast } = useToastStore((state) => state.actions);

  /**
   * 초기 미디어 장치 설정 및 송출 시작
   */
  const handleInitialMedia = async () => {
    const isMicOn = useMediaStore.getState().isMicOn;
    const isCameraOn = useMediaStore.getState().isCameraOn;
    if (!isCameraOn && !isMicOn) return;

    try {
      // 1. 하드웨어 트랙 확보
      await streamActions.ensureTracks({ video: isCameraOn, audio: isMicOn });

      // 2. 애플리케이션 서비스를 통해 송출 시작
      const tasks = [];
      if (isMicOn) tasks.push(controls.enableMic());
      if (isCameraOn) tasks.push(controls.enableCamera());

      await Promise.all(tasks);
    } catch (error) {
      logger.custom.warn('[RoomInit] 초기 미디어 장치 연결 실패:', error);
    }
  };

  /**
   * 메인 초기화 파이프라인
   */
  const runInitPipeline = useCallback(async () => {
    try {
      if (!roomId) throw new Error('유효하지 않은 방 ID 입니다.');

      const myInfo = useRoomStore.getState().myInfo;
      if (!myInfo) throw new Error('내 참가자 정보가 존재하지 않습니다.');

      // 로딩 시작
      setIsLoading(true);
      setError(null);

      // 1. 소켓 연결 및 이벤트 핸들러 등록
      const socket = await socketActions.connect();
      if (!socket) throw new Error('네트워크 연결에 실패했습니다.');

      const roomManager = new MediaRoomManager(socket, {
        room: roomActions,
        media: mediaActions,
        controls: { consumeRemoteProducer: controls.consumeRemoteProducer },
      });
      roomManagerRef.current = roomManager;

      // 2. 실시간 이벤트 핸들러 설정
      roomManager.setupSystemHandlers();

      // 3. 방 입장 요청
      const routerRtpCapabilities = await roomManager.join(roomId, myInfo.id);
      const role = useRoomStore.getState().myInfo?.role ?? myInfo.role;
      if (role === 'audience') {
        socketActions.emit('get_active_poll', (response) => {
          if (!response.success || !response.poll) return;

          pollActions.setActivePoll(response.poll);
          if (response.votedOptionId !== null) {
            pollActions.setAudienceVotedOption(response.poll.id, response.votedOptionId);
          }

          const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
          if (activeDialog !== 'vote') setActiveDialog('vote');
        });
      }

      if (role === 'presenter') {
        InteractionSignaling.setupPresenterHandlers(socket, {
          handleUpdateGestureStatus: (data) => {
            addToast({ type: 'gesture', title: data.participantName, gesture: data.gesture });
          },
          handleUpdatePollDetail: (data) => {
            pollActions.updatePollDetail({
              ...data,
              voter: {
                ...data.voter,
                optionId: data.voter.optionId,
              },
            });
          },
          handlePollEndDetail: pollActions.setCompletedFromEndDetail,
          handleUpdateQnaDetail: qnaActions.updateQnaDetail,
          handleQnaEndDetail: qnaActions.setCompletedFromEndDetail,
        });
      } else {
        InteractionSignaling.setupAudienceHandlers(socket, {
          handleUpdateGestureStatus: (data) => {
            addToast({ type: 'gesture', title: data.participantName, gesture: data.gesture });
          },
          handleStartPoll: (data) => {
            pollActions.setActivePoll(data);

            const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
            if (activeDialog !== 'vote') setActiveDialog('vote');
          },
          handleUpdatePoll: pollActions.updatePollOptions,
          handlePollEnd: (data) => {
            pollActions.clearActivePoll(data.pollId);
            const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
            if (activeDialog === 'vote') setActiveDialog('vote');
            // TODO: 투표 결과 표시 방식 개선
            addToast({
              type: 'info',
              title: data.title,
              description: data.options
                .map((option) => `${option.value}: ${option.count}`)
                .join(' / '),
            });
          },
          handleStartQna: (data) => {
            qnaActions.setActiveQna(data);
            const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
            if (activeDialog !== 'qna') setActiveDialog('qna');
          },
          handleUpdateQna: qnaActions.updateQnaSub,
          handleQnaEnd: (data) => {
            qnaActions.clearActiveQna(data.qnaId);
            const { activeDialog, setActiveDialog } = useRoomUIStore.getState();
            if (activeDialog === 'qna') setActiveDialog('qna');
            addToast({
              type: 'info',
              title: 'Q&A가 종료되었습니다.',
            });
            // TODO: 익명으로 답변 공개인 경우에 채팅창에 표시
          },
        });
      }

      // 4. Mediasoup Device 초기화
      await infra.initDevice(routerRtpCapabilities);

      // 5. 기존 참가자들의 오디오와 화면공유 즉시 수신
      await controls.consumeExistingProducers();

      // 6. 미디어 스트림 획득 및 송출 시작
      await handleInitialMedia();

      setIsSuccess(true);
      logger.custom.info('[RoomInit] 모든 초기화 시퀀스 완료');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('알 수 없는 초기화 실패');
      logger.custom.error('[RoomInit] 에러 발생:', errorObj);
      setError(errorObj);

      roomManagerRef.current = null;
      hasStartedInit.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [
    roomId,
    roomActions,
    mediaActions,
    socketActions,
    pollActions,
    qnaActions,
    controls,
    infra,
    addToast,
  ]);

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
      if (socket?.connected) {
        InteractionSignaling.removeAllHandlers(socket);
      }

      // MediaRoomManager 정리
      if (roomManagerRef.current) {
        roomManagerRef.current.cleanup();
        roomManagerRef.current = null;
      }

      // 미디어 자원 정리
      controls.cleanup();
      roomActions.setRoomEnded(false);

      if (socket?.connected) socketActions.disconnect();

      hasStartedInit.current = false;
      logger.custom.info('[RoomInit] 미디어 연결 자원 정리 완료');
    };
  }, []);

  return { isLoading, isSuccess, error, retry };
}
