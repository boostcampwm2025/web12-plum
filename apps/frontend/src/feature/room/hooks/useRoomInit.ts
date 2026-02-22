import { useCallback, useEffect, useRef, useState } from 'react';

import { SocketClient } from '@/shared/socket/client';
import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

import { useChatStore } from '../stores/useChatStore';
import { usePollStore } from '../stores/usePollStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useRoomEventHandlers } from './useRoomEventHandlers';
import { useInteractionSync } from './useInteractionSync';
import { useRemoteMedia } from './useRemoteMedia';
import { useMediaCleanup } from './useMediaCleanup';
import { useRoomJoin } from './useRoomJoin';
import { useRoomUIStore } from '../stores/useRoomUIStore';

/**
 * 방 입장 시 전체 초기화 파이프라인을 실행하는 훅
 *
 * 컴포넌트 마운트 시 자동으로 초기화를 시작하고, 언마운트 시 정리
 *
 * ## 초기화 순서 (runInitPipeline)
 * 1. 서버 URL 조회 및 Socket 연결
 * 2. 방 입장 (joinRoom) → RTP Capabilities 획득
 * 3. mediasoup Device/Transport 초기화
 * 4. 이벤트 핸들러 등록 (역할별)
 * 5. 상호작용 상태 동기화 (투표/Q&A/랭킹)
 * 6. 기존 참가자 미디어 수신 (consume)
 * 7. 내 미디어 송출 시작 (대기실 설정 복원)
 *
 * ## 정리 (언마운트 시)
 * - leaveAndCleanup으로 모든 미디어 자원 해제
 *
 * ## 반환값
 * - isLoading: 초기화 진행 중 여부 (로딩 UI 표시용)
 * - isSuccess: 초기화 성공 여부 (성공 UI 분기용)
 * - isError: 초기화 실패 여부 (에러 토스트 표시용)
 */
export function useRoomInit(handleInitialMedia: () => Promise<void>) {
  const roomId = useSafeRoomId();
  const hasStarted = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const myInfo = useRoomStore((state) => state.myInfo);
  const chatActions = useChatStore((state) => state.actions);
  const pollActions = usePollStore((state) => state.actions);
  const roomActions = useRoomStore((state) => state.actions);
  const roomUIReset = useRoomUIStore((state) => state.reset);

  const { joinRoom } = useRoomJoin();
  const { consumeExistingProducers } = useRemoteMedia();
  const { setupAllHandlers } = useRoomEventHandlers();
  const { cleanupMedia } = useMediaCleanup();
  const { syncInteractionState } = useInteractionSync();

  /**
   * 초기화 파이프라인 실행
   *
   * 순서가 중요함 - 각 단계가 이전 단계의 결과에 의존
   * 1. ensureConnected: Socket 연결 없으면 이후 단계 불가
   * 2. joinRoom: RTP Capabilities 없으면 Device 초기화 불가
   * 3. initialize: Transport 없으면 미디어 송수신 불가
   * 4. setupAllHandlers: 이벤트 수신 준비
   * 5. syncInteractionState: 투표/Q&A/랭킹 상태 동기화
   * 6. consumeExistingProducers: 기존 참가자 미디어 수신
   * 7. handleInitialMedia: 내 미디어 송출 시작
   */
  const runInitPipeline = useCallback(async () => {
    try {
      setIsLoading(true);

      // 서버 URL 조회 및 소켓 연결
      const { data: serverData } = await roomApi.getRoomServer(roomId!);
      await SocketClient.connect(serverData.serverUrl);

      const rtpCapabilities = await joinRoom(roomId!, myInfo?.id || '');

      // 전체 미디어 서비스 초기화
      await MediaConnectionService.initialize(rtpCapabilities);

      // 역할별 실시간 이벤트 핸들러 설정
      setupAllHandlers();
      await syncInteractionState(myInfo?.role ?? 'participant');

      // 기존 참가자 미디어 수신 및 내 미디어 송출 시작
      await consumeExistingProducers();

      // 대기실 설정에 따라 내 미디어 송출 시작
      await handleInitialMedia();

      setIsSuccess(true);
    } catch (error) {
      logger.custom.error('[useRoomInit] 초기화 실패', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    joinRoom,
    setupAllHandlers,
    consumeExistingProducers,
    handleInitialMedia,
    syncInteractionState,
    myInfo,
    roomId,
  ]);

  /**
   * 마운트 시 초기화 실행 (1회만)
   *
   * hasStarted ref로 중복 실행 방지
   * - deps 변경으로 인한 재실행 방지
   */
  useEffect(() => {
    const shouldWait = hasStarted.current || isSuccess || isLoading;
    if (shouldWait) return;

    hasStarted.current = true;
    runInitPipeline();
  }, [isSuccess, isLoading, runInitPipeline]);

  /**
   * 언마운트 시 정리
   *
   * 페이지 이탈, 라우팅 변경 시 모든 미디어 자원 해제
   * - Producer/Consumer 종료
   * - Transport/Device 정리
   * - 로컬 트랙 중지
   */
  useEffect(() => {
    return () => {
      cleanupMedia();
      SocketClient.disconnect();
      chatActions.clear();
      pollActions.clear();
      roomActions.reset();
      roomUIReset();
    };
  }, [cleanupMedia, chatActions, pollActions, roomActions, roomUIReset]);

  return { isLoading, isSuccess, isError };
}
