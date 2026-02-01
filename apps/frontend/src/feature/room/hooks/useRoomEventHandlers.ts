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
   * - RoomService, MediaConnectionService, ChatService 공통 핸들러 등록
   * - 역할별(발표자/참여자) 핸들러 등록
   */
  const setupAllHandlers = useCallback(
    async (role: string) => {
      // RoomService 이벤트 핸들러
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
   * 페이지 이탈 시 모든 소켓 리스너와 미디어 자원을 정리
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
