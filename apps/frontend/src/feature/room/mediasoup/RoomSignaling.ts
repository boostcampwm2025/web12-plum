import { RtpCapabilities } from 'mediasoup-client/types';
import { JoinRoomResponse, ParticipantRole } from '@plum/shared-interfaces';

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
};
