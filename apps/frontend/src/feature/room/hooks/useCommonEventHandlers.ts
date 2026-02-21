import { useCallback } from 'react';

import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaStore } from '../stores/useMediaStore';
import { useChatStore } from '../stores/useChatStore';

import { RoomService } from '../service/room';
import { ChatService } from '../service/chat';
import { useRemoteMedia } from './useRemoteMedia';

/**
 * 공통 이벤트 핸들러 (모든 역할 공통)
 *
 * - Room: 참가자 입장/퇴장, 방 종료, 발화자 감지
 * - Media: Producer/Consumer 생성/종료, 미디어 상태 변경
 * - Chat: 새 채팅 메시지
 */
export function useCommonEventHandlers() {
  const { consumeRemoteProducer, stopConsuming } = useRemoteMedia();

  const roomActions = useRoomStore((state) => state.actions);
  const mediaActions = useMediaStore((state) => state.actions);
  const chatActions = useChatStore((state) => state.actions);

  /**
   * 공통 이벤트 핸들러 등록
   *
   * - 방에 입장한 모든 사용자가 공통으로 구독해야 하는 이벤트 핸들러 등록
   * - RoomService: 참가자 입장/퇴장, 방 종료, 발화자 감지
   * - MediaConnectionService: Producer/Consumer 생성/종료, 미디어 상태 변경
   * - ChatService: 새 채팅 메시지
   */
  const setupCommonHandlers = useCallback((): void => {
    // RoomService 이벤트 핸들러
    // - onUserJoined: 새 참가자 입장 시 participants 목록에 추가
    // - onRoomEnd: 발표자가 방 종료 시 roomEnded 상태 true로 변경
    // - onUserLeft: 참가자 퇴장 시 목록에서 제거 + 해당 참가자의 모든 스트림 정리
    RoomService.setupEventHandlers({
      onUserJoined: roomActions.addParticipant,
      onRoomEnd: () => roomActions.setRoomEnded(true),
      onUserLeft: (data) => {
        roomActions.removeParticipant(data.id);
        mediaActions.removeRemoteStreamByParticipant(data.id, 'video');
        mediaActions.removeRemoteStreamByParticipant(data.id, 'audio');
        mediaActions.removeRemoteStreamByParticipant(data.id, 'screen');
      },
      onSpeakerDetected: (data) => {
        // cooldown(2초)보다 길게 설정해야 깜빡임 방지
        const ACTIVE_SPEAKER_TTL_MS = 3000;
        const myInfo = useRoomStore.getState().myInfo;
        if (!myInfo || data.participantId !== myInfo.id) {
          roomActions.addSpeakerToOrder(data.participantId);
        }
        roomActions.setActiveSpeaker(data.participantId, ACTIVE_SPEAKER_TTL_MS);
      },
    });

    // MediaConnectionService 이벤트 핸들러
    // - onNewProducer: 상대방이 미디어 송출 시작 -> Producer 목록에 추가 + audio/screen은 즉시 consume
    // - onProducerClosed: 상대방이 미디어 송출 중지 -> Producer 목록에서 제거 + Consumer 정리
    // - onConsumerClosed: 서버에서 Consumer 강제 종료 시 -> remoteStreams에서 제거
    // - onMediaStateChanged: pause/resume 시 -> 스트림 제거 또는 재consume
    MediaConnectionService.setupMediaEventHandlers({
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
        if (data.type === 'audio') {
          roomActions.setParticipantAudioMuted(data.participantId, data.action === 'pause');
        }
      },
    });

    // ChatService 이벤트 핸들러
    ChatService.setupEventHandlers({ onNewChat: chatActions.addChat });
  }, [roomActions, mediaActions, chatActions, consumeRemoteProducer, stopConsuming]);

  /**
   * 공통 이벤트 핸들러 제거
   *
   * - 방을 나가거나 컴포넌트가 언마운트될 때 호출하여 메모리 누수 및 중복 핸들러 등록 방지
   * - RoomService: 모든 이벤트 핸들러 제거
   * - MediaConnectionService: 모든 미디어 이벤트 핸들러 제거
   * - ChatService: 모든 채팅 이벤트 핸들러 제거
   */
  const removeCommonHandlers = useCallback(() => {
    RoomService.removeEventHandlers();
    MediaConnectionService.removeMediaEventHandlers();
    ChatService.removeAllEventHandlers();
  }, []);

  return { setupCommonHandlers, removeCommonHandlers };
}
