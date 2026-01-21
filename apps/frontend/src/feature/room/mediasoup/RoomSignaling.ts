import { RtpCapabilities } from 'mediasoup-client/types';
import {
  JoinRoomResponse,
  MediaStateChangedPayload,
  MediaType,
  NewProducerPayload,
  ParticipantRole,
  UserJoinedPayload,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { MediaSocket } from '../types';
import { Participant } from '../stores/useRoomStore';

/**
 * 방 입장 및 세션 관리를 담당하는 시그널링 모듈
 */
export const RoomSignaling = {
  /**
   * 서버의 방에 입장하고 초기 데이터(참가자 목록, RTP 설정)를 동기화
   */
  joinRoom: (
    socket: MediaSocket,
    roomId: string,
    myId: string,
    initParticipants: (map: Map<string, Participant>) => void,
  ): Promise<RtpCapabilities> => {
    return new Promise((resolve, reject) => {
      const payload = { roomId, participantId: myId };

      const handleResponse = (response: JoinRoomResponse) => {
        if (response.success) {
          const { mediasoup, participants: rawParticipants } = response;
          const { routerRtpCapabilities, existingProducers } = mediasoup;

          const participantMap = new Map<string, Participant>();

          // 기본 참가자 정보 매핑
          rawParticipants.forEach((participant) => {
            participantMap.set(participant.id, {
              id: participant.id,
              name: participant.name,
              role: participant.role as ParticipantRole,
              joinedAt: new Date(participant.joinedAt),
              producers: new Map(),
            });
          });

          // 본인 정보는 원격 목록에서 제외
          if (participantMap.has(myId)) participantMap.delete(myId);

          // 기존 Producer 정보 매핑
          existingProducers.forEach((producer) => {
            const participant = participantMap.get(producer.participantId);
            if (participant) participant.producers.set(producer.type, producer.producerId);
          });

          // 전역 스토어 초기화 및 데이터 반환
          initParticipants(participantMap);
          logger.media.info(`[Room] 방 입장 완료 (참여자: ${participantMap.size}명)`);

          resolve(routerRtpCapabilities as RtpCapabilities);
        } else {
          logger.media.error(`[Room] 방 입장 실패:`, response.error);
          reject(new Error(response.error || '방 입장 실패'));
        }
      };

      socket.emit('join_room', payload, handleResponse);
    });
  },

  /**
   * 방 세션 및 미디어 관련 모든 실시간 리스너 설정
   */
  setupAllHandlers: (
    socket: MediaSocket,
    actions: {
      addParticipant: (data: UserJoinedPayload) => void;
      removeParticipant: (id: string) => void;
      addProducer: (participantId: string, type: MediaType, producerId: string) => void;
      consumeRemoteProducer: (data: NewProducerPayload) => void;
      handleMediaStateChanged: (data: MediaStateChangedPayload) => void;
    },
  ) => {
    // 참가자 입장
    socket.on('user_joined', (data) => {
      logger.media.info(`[Room] 참가자 입장: ${data.name}`);
      actions.addParticipant(data);
    });

    // 참가자 퇴장
    socket.on('user_left', (data) => {
      logger.media.info(`[Room] 참가자 퇴장: ${data.id}`);
      actions.removeParticipant(data.id);
    });

    // 미디어 스트림 발생 (다른 사람이 카메라/마이크 켰을 때)
    socket.on('new_producer', (data) => {
      logger.media.info(`[Room] 새로운 프로듀서 발생: ${data.participantId} - ${data.type}`);

      // 스토어에 producer 정보 저장 (비디오는 페이지네이션에서 사용)
      actions.addProducer(data.participantId, data.type, data.producerId);

      // 오디오만 즉시 consume
      if (data.type === 'audio') actions.consumeRemoteProducer(data);
    });

    // 미디어 상태 변경 (다른 사람이 Mute/Unmute 했을 때)
    socket.on('media_state_changed', (data) => {
      logger.media.info(
        `[Room] 미디어 상태 변경: ${data.participantId} [${data.type}: ${data.action}]`,
      );
      actions.handleMediaStateChanged(data);
    });
  },

  /**
   * 모든 리스너 일괄 해제 (메모리 누수 방지)
   */
  removeAllHandlers: (socket: MediaSocket) => {
    socket.off('user_joined');
    socket.off('user_left');
    socket.off('new_producer');
    socket.off('media_state_changed');
    logger.media.info('[Room] 모든 시그널링 리스너 해제 완료');
  },
};
