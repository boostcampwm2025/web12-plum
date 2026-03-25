import { useState } from 'react';
import type {
  EnterLectureRequestBody,
  EnterRoomResponse,
  ParticipantRole,
} from '@plum/shared-interfaces';
import { RtpCapabilities } from 'mediasoup-client/types';

import { useMediaStore } from '@/feature/media/stores/useMediaStore';
import { Participant, useRoomStore } from '@/feature/room/stores/useRoomStore';

import { roomApi } from '@/shared/api';
import { logger } from '@/shared/lib/logger';

/**
 * 응답 데이터를 기반으로 참가자 맵과 내 정보를 생성
 *
 * - 서버에서 내려온 participants 배열을 Participant 도메인 모델로 매핑
 * - 현재 참가자(participantId)는 목록에서 제외
 * - existingProducers 정보를 각 참가자의 producers 맵에 병합
 */
function buildParticipantMap(roomData: EnterRoomResponse) {
  const { participantId, name, role, mediasoup, participants: rawParticipants } = roomData;
  const { existingProducers } = mediasoup;

  const participantMap = new Map<string, Participant>();

  rawParticipants.forEach((participant) => {
    participantMap.set(participant.id, {
      id: participant.id,
      name: participant.name,
      role: participant.role as ParticipantRole,
      joinedAt: new Date(participant.joinedAt),
      producers: new Map(),
    });
  });

  // 본인 제거
  participantMap.delete(participantId);

  existingProducers.forEach((producer) => {
    const participant = participantMap.get(producer.participantId);
    if (participant) participant.producers.set(producer.type, producer.producerId);
  });

  return {
    participants: participantMap,
    myInfo: { id: participantId, name, role },
  };
}

/**
 * 강의실 입장 유스케이스를 캡슐화한 훅
 *
 * - roomId와 폼 데이터를 사용해 joinRoom API를 호출
 * - 응답으로 받은 mediasoup 라우터 RTP capabilities를 스토어에 설정
 * - 기존 참가자/producer 정보를 Participant 맵으로 변환해 room 스토어에 초기화 (본인 제외)
 * - 내 참가자 정보와 초기 미디어(on/off) 상태를 스토어에 설정
 */
export function useEnterRoom(roomId: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { initialize: initializeMedia } = useMediaStore((state) => state.actions);
  const { setMyInfo, setRoomTitle, setRouterRtpCapabilities, initParticipants } = useRoomStore(
    (state) => state.actions,
  );

  /**
   * 강의실 입장 처리
   * 발생한 에러는 호출한 쪽에서 처리하도록 throw 함
   */
  const enterRoom = async (data: EnterLectureRequestBody) => {
    if (!roomId) throw new Error('강의실 ID가 없어 입장에 실패');

    setIsSubmitting(true);
    try {
      const { data: roomData } = await roomApi.joinRoom(roomId, data);

      // mediasoup / 참가자 도메인 모델로 변환
      const { routerRtpCapabilities } = roomData.mediasoup;
      const { participants, myInfo } = buildParticipantMap(roomData);

      setMyInfo(myInfo);
      setRoomTitle(data.name);
      initializeMedia(data.isAudioOn, data.isVideoOn);
      setRouterRtpCapabilities(routerRtpCapabilities as RtpCapabilities);
      initParticipants(participants);
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
