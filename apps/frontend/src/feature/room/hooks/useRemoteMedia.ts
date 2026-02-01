import { useCallback } from 'react';
import type { MediaType, NewProducerPayload, MediaKind } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '@/feature/room/stores/useMediaStore';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { MediaConnectionService } from '@/mediasoup/mediaConnection.service';

/**
 * 상대방의 미디어를 수신(Consume)하고 관리하는 훅
 */
export const useRemoteMedia = () => {
  const mediaActions = useMediaStore((state) => state.actions);
  const roomActions = useRoomStore((state) => state.actions);

  /**
   * 새로운 원격 Producer 수신
   * - 동일 참여자/타입 중복 스트림 확인 및 기존 Consumer 정리
   * - startConsuming으로 신규 Consumer + MediaStream 생성
   * - addRemoteStream으로 Zustand에 등록 (UI 렌더링)
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
   * - getParticipantList()로 기존 참여자 목록 획득
   * - 각 참여자의 audio/screen Producer ID 확인
   * - 존재할 경우 consumeRemoteProducer 호출 태스크 배열 생성
   * - Promise.allSettled로 병렬 consumeRemoteProducer 호출
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
   * 특정 원격 스트림 정리 (상대방 producer 종료 시)
   * - remoteStreams 순회하며 participantId/type 일치 스트림 탐색
   * - 발견 시 removeConsumer 호출
   * - Zustand 스토어에서 제거
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
