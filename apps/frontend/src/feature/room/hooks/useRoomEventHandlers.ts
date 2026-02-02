import { useCallback, useEffect } from 'react';

import { useToastStore } from '@/store/useToastStore';
import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaStore } from '../stores/useMediaStore';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { useChatStore } from '../stores/useChatStore';
import { useRankStore } from '../stores/useRankStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';

import { RoomService } from '../service/room';
import { InteractionService } from '../service/interaction';
import { ChatService } from '../service/chat';
import { PollService } from '../service/poll';
import { QnaService } from '../service/qna';
import { logger } from '@/shared/lib/logger';
import { useRemoteMedia } from './useRemoteMedia';

/**
 * 실시간 이벤트 핸들러 설정 훅
 *
 * 서버에서 발생하는 Socket.IO 이벤트를 수신하고 처리하는 핸들러들을 등록
 *
 * - 서버 -> 클라이언트 실시간 이벤트 수신 및 처리
 * - 역할(presenter/audience)에 따른 핸들러 분기
 * - 컴포넌트 언마운트 시 리스너 정리
 *
 * ## 등록되는 이벤트 종류
 * - Room: 참가자 입장/퇴장, 방 종료
 * - Media: Producer 생성/종료, Consumer 종료, 미디어 상태 변경
 * - Chat: 새 채팅 메시지
 * - Poll/Qna: 투표/Q&A 시작/업데이트/종료 (역할별 상이)
 * - Interaction: 랭킹 업데이트, 제스처 알림
 *
 * ## 사용 시점
 * - Transport 연결 완료 후 호출
 */
export function useRoomEventHandlers() {
  const { consumeRemoteProducer, stopConsuming } = useRemoteMedia();

  const roomActions = useRoomStore((state) => state.actions);
  const mediaActions = useMediaStore((state) => state.actions);
  const pollActions = usePollStore((state) => state.actions);
  const qnaActions = useQnaStore((state) => state.actions);
  const chatActions = useChatStore((state) => state.actions);
  const rankActions = useRankStore((state) => state.actions);
  const toastActions = useToastStore((state) => state.actions);

  /**
   * 모든 이벤트 핸들러 등록
   *
   * Transport 연결 완료 후 호출하여 서버 이벤트 수신 준비
   *
   * ## 공통 핸들러 (모든 역할)
   * - RoomService: user-joined, user-left, room-end
   * - MediaConnectionService: new-producer, producer-closed, consumer-closed, media-state-changed
   * - ChatService: new-chat
   *
   * ## 역할별 핸들러
   * - presenter: Poll/Qna 상세 업데이트, 제스처 토스트 수신
   * - audience: Poll/Qna 참여 UI, 랭킹/점수 업데이트
   *
   * @param role 'presenter' | 'audience'
   */
  const setupAllHandlers = useCallback(
    async (role: string) => {
      // RoomService 이벤트 핸들러
      // - onUserJoined: 새 참가자 입장 시 participants 목록에 추가
      // - onRoomEnd: 발표자가 방 종료 시 roomEnded 상태 true로 변경
      // - onUserLeft: 참가자 퇴장 시 목록에서 제거 + 해당 참가자의 모든 스트림 정리
      const roomTask = RoomService.setupEventHandlers({
        onUserJoined: roomActions.addParticipant,
        onRoomEnd: () => roomActions.setRoomEnded(true),
        onUserLeft: (data) => {
          roomActions.removeParticipant(data.id);
          mediaActions.removeRemoteStreamByParticipant(data.id, 'video');
          mediaActions.removeRemoteStreamByParticipant(data.id, 'audio');
          mediaActions.removeRemoteStreamByParticipant(data.id, 'screen');
        },
      });

      // MediaConnectionService 이벤트 핸들러
      // - onNewProducer: 상대방이 미디어 송출 시작 -> Producer 목록에 추가 + audio/screen은 즉시 consume
      // - onProducerClosed: 상대방이 미디어 송출 중지 -> Producer 목록에서 제거 + Consumer 정리
      // - onConsumerClosed: 서버에서 Consumer 강제 종료 시 -> remoteStreams에서 제거
      // - onMediaStateChanged: pause/resume 시 -> 스트림 제거 또는 재consume
      const mediaTask = MediaConnectionService.setupMediaEventHandlers({
        onNewProducer: (data) => {
          roomActions.addProducer(data.participantId, data.type, data.producerId);
          if (data.type === 'audio' || data.type === 'screen') {
            consumeRemoteProducer(data);
          }
        },
        onProducerClosed: (data) => {
          roomActions.removeProducer(data.participantId, data.type);
          stopConsuming(data.participantId, data.type);
        },
        onConsumerClosed: (data) => {
          mediaActions.removeRemoteStream(data.consumerId);
        },
        onMediaStateChanged: (data) => {
          if (data.action === 'pause')
            mediaActions.removeRemoteStreamByParticipant(data.participantId, data.type);
          else consumeRemoteProducer(data);
        },
      });

      // ChatService 이벤트 핸들러
      const chatTask = ChatService.setupEventHandlers({ onNewChat: chatActions.addChat });

      // 공통 작업 배열
      const commonTasks = [roomTask, mediaTask, chatTask];

      // 역할별 작업 배열
      // presenter: 투표/QnA 결과 상세 수신, 제스처 토스트 수신
      // audience: 투표/QnA 참여 UI 표시, 랭킹/점수 업데이트
      let roleTasks: Promise<void>[] = [];
      if (role === 'presenter') {
        roleTasks = [
          PollService.setupPresenterEventHandlers({
            onUpdatePollDetail: pollActions.updatePollDetail,
            onPollEndDetail: pollActions.setCompletedFromEndDetail,
          }),
          QnaService.setupPresenterEventHandlers({
            onUpdateQnaDetail: qnaActions.updateQnaDetail,
            onQnaEndDetail: qnaActions.setCompletedFromEndDetail,
          }),
          InteractionService.setupPresenterEventHandlers({
            onPresenterRankUpdate: rankActions.updatePresenterRank,
            onUpdateGestureStatus: (data) =>
              toastActions.addToast({
                type: 'gesture',
                title: data.participantName,
                gesture: data.gesture,
              }),
          }),
        ];
      } else {
        roleTasks = [
          PollService.setupAudienceEventHandlers({
            onUpdatePoll: pollActions.updatePollOptions,
            onStartPoll: (data) => {
              pollActions.setActivePoll(data);
              useRoomUIStore.getState().setActiveDialog('vote');
            },
            onPollEnd: (data) => {
              pollActions.clearActivePoll(data.pollId);
              useRoomUIStore.getState().setPollResult(data);
            },
          }),
          QnaService.setupAudienceEventHandlers({
            onUpdateQna: qnaActions.updateQnaSub,
            onStartQna: (data) => {
              qnaActions.setActiveQna(data);
              useRoomUIStore.getState().setActiveDialog('qna');
            },
            onQnaEnd: (data) => {
              qnaActions.clearActiveQna(data.qnaId);
              if (data.text?.length) chatActions.addQnaResult(data);
            },
          }),
          InteractionService.setupAudienceEventHandlers({
            onScoreUpdate: rankActions.updateMyScore,
            onRankUpdate: rankActions.updateRank,
            onUpdateGestureStatus: (data) =>
              toastActions.addToast({
                type: 'gesture',
                title: data.participantName,
                gesture: data.gesture,
              }),
          }),
        ];
      }

      // 모든 작업을 병렬로 실행
      await Promise.all([...commonTasks, ...roleTasks]);
      logger.socket.debug(`[useRoomEventHandlers] 모든 (${role}) 핸들러 등록 완료`);
    },
    [
      roomActions,
      mediaActions,
      pollActions,
      qnaActions,
      chatActions,
      rankActions,
      toastActions,
      consumeRemoteProducer,
      stopConsuming,
    ],
  );

  /**
   * 컴포넌트 언마운트 시 모든 소켓 리스너 정리
   *
   * 정리하지 않으면 발생하는 문제:
   * - 메모리 누수 (이벤트 리스너가 계속 남아있음)
   * - 중복 핸들러 등록 (재입장 시 핸들러가 2번씩 호출됨)
   * - 잘못된 상태 업데이트 (이전 방의 이벤트가 현재 UI에 반영됨)
   */
  useEffect(() => {
    return () => {
      RoomService.removeEventHandlers();
      MediaConnectionService.removeMediaEventHandlers();
      InteractionService.removeAllEventHandlers();
      PollService.removeAllEventHandlers();
      QnaService.removeAllEventHandlers();
      ChatService.removeAllEventHandlers();
    };
  }, []);

  return { setupAllHandlers };
}
