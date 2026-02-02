import { useCallback } from 'react';
import type { MediaType, NewProducerPayload, MediaKind } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '@/feature/room/stores/useMediaStore';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';

/**
 * 상대방의 미디어를 수신(Consume)하고 관리하는 훅
 *
 * useLocalMedia가 송출을 담당한다면, 이 훅은 수신을 담당
 *
 * ## 주요 역할
 * - 다른 참가자의 Producer를 Consumer로 수신
 * - 수신된 MediaStream을 Zustand 스토어에 등록 (UI 렌더링)
 * - 참가자 퇴장 또는 미디어 종료 시 Consumer 정리
 *
 * ## 호출 시점
 * - consumeRemoteProducer: 서버에서 'new-producer' 이벤트 수신 시
 * - consumeExistingProducers: 방 입장 직후 (이미 있던 참가자들 미디어 수신)
 * - stopConsuming: 서버에서 'producer-closed' 이벤트 수신 시
 *
 * ## useLocalMedia와의 관계
 * - useLocalMedia: 내 미디어 → 서버로 송출 (Producer)
 * - useRemoteMedia: 서버 → 상대방 미디어 수신 (Consumer)
 */
export const useRemoteMedia = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const roomActions = useRoomStore((state) => state.actions);

  /**
   * 새로운 원격 Producer 수신
   *
   * 서버에서 'new-producer' 이벤트를 받았을 때 호출
   *
   * 1. 동일 참여자/타입의 기존 Consumer가 있으면 정리 (중복 방지)
   *    → 예: 같은 사람이 카메라를 껐다 켰을 때
   * 2. MediaConnectionService.startConsuming()으로 신규 Consumer + MediaStream 생성
   * 3. Zustand remoteStreams에 등록 → UI에서 <video> 렌더링
   *
   * @param data 서버에서 받은 Producer 정보 (producerId, participantId, type, kind)
   * @throws Consumer 생성 실패 시 에러 발생 (catch 후 재throw)
   */
  const consumeRemoteProducer = useCallback(
    async (data: NewProducerPayload): Promise<void> => {
      try {
        const { remoteStreams } = useMediaStore.getState();

        // 중복 스트림 확인 및 클린업
        for (const [id, stream] of remoteStreams.entries()) {
          if (stream.participantId !== data.participantId || stream.type !== data.type) continue;

          MediaConnectionService.removeConsumer(id);
          mediaActions.removeRemoteStream(id);
          break;
        }

        const { consumer, stream } = await MediaConnectionService.startConsuming(data.producerId);

        // 스토어에 추가하여 UI 렌더링 유도
        const remoteStream = {
          participantId: data.participantId,
          type: data.type,
          consumerId: consumer.id,
        };
        mediaActions.addRemoteStream(consumer.id, { ...remoteStream, stream });

        logger.media.info(
          `[useRemoteMedia] 스트림 수신 성공: ${data.participantId} (${data.type})`,
        );
      } catch (error) {
        logger.media.error('[useRemoteMedia] 스트림 수신 실패', error);
        throw error;
      }
    },
    [mediaActions],
  );

  /**
   * 방에 이미 있던 참여자들의 미디어 일괄 수신
   *
   * 방 입장 직후, Transport 연결 완료 시점에 호출
   *
   * - 내가 입장하기 전에 이미 방에 있던 참가자들은 'new-producer' 이벤트를 받지 못함
   * - 따라서 기존 참가자들의 Producer를 수동으로 consume해야 함
   *
   * 1. getParticipantList()로 기존 참여자 목록 획득 (나 자신 제외)
   * 2. 각 참여자의 audio/screen Producer ID 확인
   * 3. 존재하는 Producer에 대해 consumeRemoteProducer 태스크 생성
   * 4. Promise.allSettled로 모든 태스크 병렬 실행
   *
   * video Producer를 consume하지 않는 이유:
   * - 현재 강의 시스템에서 video는 송출하지 않음 (audio, screen만 사용)
   * - 페이지네이션에 따라 특정 페이지의 참여자만 송출하도록 설계됨
   */
  const consumeExistingProducers = useCallback(async (): Promise<void> => {
    const participants = roomActions.getParticipantList();
    const myId = useRoomStore.getState().myInfo?.id;

    const tasks = participants.flatMap((participant) => {
      if (participant.id === myId) return [];

      const subTasks = [];
      const audioId = participant.producers.get('audio');
      const screenId = participant.producers.get('screen');

      if (audioId) {
        const audioPayload = {
          producerId: audioId,
          participantId: participant.id,
          type: 'audio' as MediaType,
          kind: 'audio' as MediaKind,
          participantRole: participant.role,
        };
        const audioTask = consumeRemoteProducer(audioPayload);
        subTasks.push(audioTask);
      }
      if (screenId) {
        const screenPayload = {
          producerId: screenId,
          participantId: participant.id,
          type: 'screen' as MediaType,
          kind: 'video' as MediaKind,
          participantRole: participant.role,
        };
        const screenTask = consumeRemoteProducer(screenPayload);
        subTasks.push(screenTask);
      }
      return subTasks;
    });

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
      logger.media.debug(`[useRemoteMedia] 기존 참여자 미디어 수신 완료 (${tasks.length}개)`);
    }
  }, [roomActions, consumeRemoteProducer]);

  /**
   * 특정 원격 스트림 정리
   *
   * 서버에서 'producer-closed' 이벤트를 받았을 때 호출
   *
   * 호출 시점 예시:
   * - 상대방이 마이크를 껐을 때 (audio Producer 종료)
   * - 상대방이 화면공유를 중지했을 때 (screen Producer 종료)
   * - 상대방이 방을 나갔을 때 (모든 Producer 종료)
   *
   * 1. remoteStreams에서 participantId + type이 일치하는 스트림 탐색
   * 2. MediaConnectionService.removeConsumer()로 Consumer 정리
   * 3. Zustand remoteStreams에서 제거 → UI에서 해당 <video> 사라짐
   *
   * @param participantId 상대방 참가자 ID
   * @param type 미디어 타입 ('audio' | 'video' | 'screen')
   */
  const stopConsuming = useCallback(
    (participantId: string, type: MediaType) => {
      const { remoteStreams } = useMediaStore.getState();

      for (const [id, stream] of remoteStreams.entries()) {
        if (stream.participantId !== participantId || stream.type !== type) continue;
        MediaConnectionService.removeConsumer(id);
        mediaActions.removeRemoteStream(id);
        logger.media.debug(`[useRemoteMedia] 스트림 수신 중단: ${participantId} (${type})`);
        return;
      }
    },
    [mediaActions],
  );

  return {
    consumeRemoteProducer,
    consumeExistingProducers,
    stopConsuming,
  };
};
