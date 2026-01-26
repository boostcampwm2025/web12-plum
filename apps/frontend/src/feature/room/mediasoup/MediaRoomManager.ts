import { RtpCapabilities } from 'mediasoup-client/types';
import { NewProducerPayload, ParticipantRole, RoomInfo } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { MediaActions } from '../stores/useMediaStore';
import { Participant, RoomActions } from '../stores/useRoomStore';
import { MediaSocket } from '../types';
import { RoomSignaling } from '../mediasoup/RoomSignaling';

/**
 * 방의 입장 및 실시간 이벤트 배분을 담당
 */
export class MediaRoomManager {
  constructor(
    private socket: MediaSocket,
    private actions: {
      room: RoomActions;
      media: MediaActions;
      controls: { consumeRemoteProducer: (data: NewProducerPayload) => Promise<void> };
    },
  ) {}

  /**
   * 모든 실시간 리스너 등록
   */
  setupSystemHandlers() {
    // 참가자 입장
    this.socket.on('user_joined', (data) => {
      logger.media.info(`[Room] 참가자 입장: ${data.name}`);
      this.actions.room.addParticipant(data);
    });

    // 참가자 퇴장
    this.socket.on('user_left', (data) => {
      logger.media.info(`[Room] 참가자 퇴장: ${data.id}`);
      this.actions.room.removeParticipant(data.id);
    });

    // 새로운 미디어 프로듀서 발생
    this.socket.on('new_producer', (data) => {
      logger.media.info(`[Room] 새 프로듀서: ${data.participantId} (${data.type})`);

      // 스토어에 producer 정보 저장 (비디오는 페이지네이션에서 사용)
      this.actions.room.addProducer(data.participantId, data.type, data.producerId);

      // 오디오/스크린 프로듀서는 즉시 소비 시작
      if (data.type === 'audio' || data.type === 'screen') {
        this.actions.controls.consumeRemoteProducer(data);
      }
    });

    // 미디어 상태 변경 처리
    this.socket.on('media_state_changed', (data) => {
      if (data.action === 'pause') {
        this.actions.media.removeRemoteStreamByParticipant(data.participantId, data.type);
      }
    });

    // 강의 종료 처리
    this.socket.on('room_end', () => {
      logger.media.info('[Room] 강의가 종료되었습니다.');
      this.actions.room.setRoomEnded(true);
    });
  }

  /**
   * 방 입장 시퀀스
   */
  async join(roomId: string, myId: string): Promise<RtpCapabilities> {
    const response = await RoomSignaling.joinRoom(this.socket, roomId, myId);

    if (!response.success) {
      logger.media.error(`[Room] 방 입장 실패:`, response.error);
      throw new Error(response.error || '방 입장 실패');
    }

    // 비즈니스 로직: 응답 파싱 및 스토어 업데이트
    const { mediasoup, participants: rawParticipants } = response as {
      success: true;
      participantId: string;
      participantName: string;
      role: ParticipantRole;
    } & RoomInfo;
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

    // 내 정보 설정
    const me = participantMap.get(myId);
    if (me) this.actions.room.setMyInfo(me);

    // 본인 정보는 원격 목록에서 제외
    participantMap.delete(myId);

    // 기존 Producer 정보 매핑
    existingProducers.forEach((producer) => {
      const participant = participantMap.get(producer.participantId);
      if (participant) participant.producers.set(producer.type, producer.producerId);
    });

    this.actions.room.initParticipants(participantMap);
    logger.media.info(`[Room] 방 입장 완료 (참여자: ${participantMap.size}명)`);

    return routerRtpCapabilities as RtpCapabilities;
  }

  /**
   * 이벤트 핸들러 일괄 해제
   */
  cleanup() {
    this.socket.off('user_joined');
    this.socket.off('user_left');
    this.socket.off('new_producer');
    this.socket.off('media_state_changed');
    this.socket.off('room_end');
    logger.media.info('[Room] 모든 시그널링 리스너 해제 완료');
  }
}
