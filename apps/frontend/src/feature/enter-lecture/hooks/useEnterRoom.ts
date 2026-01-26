import { useState } from 'react';
import { RtpCapabilities } from 'mediasoup-client/types';
import type { EnterLectureRequestBody, ParticipantRole } from '@plum/shared-interfaces';

import { Participant, useRoomStore } from '@/feature/room/stores/useRoomStore';
import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';

/**
 * 강의실 입장 훅
 * - mediasoup 라우터 RTP capabilities 설정
 * - 참가자 목록 초기화 (본인 제외)
 * - 내 정보 설정
 * - 강의실 페이지로 이동
 */
export function useEnterRoom() {
  const roomId = useSafeRoomId();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMyInfo, setRoomTitle, setRouterRtpCapabilities, initParticipants } = useRoomStore(
    (state) => state.actions,
  );

  /**
   * 강의실 입장 처리
   * 발생한 에러는 호출한 쪽에서 처리하도록 throw 함
   */
  const enterRoom = async (data: EnterLectureRequestBody) => {
    if (!roomId) return;
    setIsSubmitting(true);
    logger.api.info('강의실 입장 요청');

    try {
      const { data: roomData } = await roomApi.joinRoom(roomId, data);
      const { participantId, name, role, mediasoup, participants: rawParticipants } = roomData;
      const { routerRtpCapabilities, existingProducers } = mediasoup;

      const participantMap = new Map<string, Participant>();

      // 기본 참가자 정보 매핑
      rawParticipants.forEach((participant) => {
        const mappedParticipant = {
          id: participant.id,
          name: participant.name,
          role: participant.role as ParticipantRole,
          joinedAt: new Date(participant.joinedAt),
          producers: new Map(),
        };

        participantMap.set(participant.id, mappedParticipant);
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
      setRoomTitle(data.name);
      setRouterRtpCapabilities(routerRtpCapabilities as RtpCapabilities);
      initParticipants(participantMap as Map<string, Participant>);

      logger.api.info('강의실 입장 데이터 준비 완료');
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
