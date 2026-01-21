import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { RtpCapabilities } from 'mediasoup-client/types';
import type {
  EnterLectureRequestBody,
  EnterRoomResponse,
  ParticipantRole,
} from '@plum/shared-interfaces';

import { ROUTES } from '@/app/routes/routes';
import { Participant, useRoomStore } from '@/feature/room/stores/useRoomStore';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

/**
 * 강의실 입장 훅
 * - mediasoup 라우터 RTP capabilities 설정
 * - 참가자 목록 초기화 (본인 제외)
 * - 내 정보 설정
 * - 강의실 페이지로 이동
 */
export function useEnterRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMyInfo, setRouterRtpCapabilities, initParticipants } = useRoomStore(
    (state) => state.actions,
  );

  /**
   * 강의실 입장 처리
   */
  const enterRoom = async (data: EnterLectureRequestBody) => {
    if (!roomId) {
      logger.api.error('URL에서 RoomID를 찾을 수 없습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await roomApi.joinRoom(roomId, data);
      const roomData: EnterRoomResponse = response.data;

      const { participantId, name, role, mediasoup, participants: rawParticipants } = roomData;
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

      // 참가자 본인 정보는 제외
      if (participantMap.has(participantId)) participantMap.delete(participantId);

      existingProducers.forEach((producer) => {
        const participant = participantMap.get(producer.participantId);
        if (participant) {
          participant.producers.set(producer.type, producer.producerId);
        }
      });

      // 상태 업데이트
      setMyInfo({ id: participantId, name, role });
      setRouterRtpCapabilities(routerRtpCapabilities as RtpCapabilities);
      initParticipants(participantMap as Map<string, Participant>);

      logger.api.info('강의실 입장 데이터 준비 완료');

      navigate(ROUTES.ROOM(roomId));
    } catch (error) {
      logger.api.error(`강의실 입장 실패: ${error}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    enterRoom,
    isSubmitting,
  };
}
