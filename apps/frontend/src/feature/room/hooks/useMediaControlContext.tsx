import { createContext, useContext, useCallback, type ReactNode, useMemo } from 'react';
import type { MediaKind, MediaType, NewProducerPayload } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaInfra } from '@/mediasoup/useMediaInfra';
import { useSocketStore } from '@/store/useSocketStore';

import { useRoomStore } from '../stores/useRoomStore';
import { useMediaStore } from '../stores/useMediaStore';

const ERROR_MESSAGES = {
  notReady: '연결이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.',
  screenShareDenied: '화면 공유 권한이 거부되었습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
} as const;

// UI 레이어용 공통 에러
export class MediaControlError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;

    super(message);
    this.name = 'MediaControlError';
    this.type = type;

    logger.ui.error('[MediaControl]', message);
  }
}
interface MediaControlsContextType {
  // 로컬 미디어
  enableMic: () => Promise<void>;
  disableMic: () => Promise<void>;
  enableCamera: () => Promise<void>;
  disableCamera: () => Promise<void>;
  enableScreenShare: () => Promise<void>;
  disableScreenShare: () => Promise<void>;

  // 원격 미디어
  consumeRemoteProducer: (data: NewProducerPayload) => Promise<void>;
  consumeExistingProducers: () => Promise<void>;
  stopConsuming: (participantId: string, type: MediaType) => void;

  // 전체 정리
  cleanup: () => void;
}

const MediaControlsContext = createContext<MediaControlsContextType | null>(null);

interface MediaControlsProviderProps {
  children: ReactNode;
}

export function MediaControlsProvider({ children }: MediaControlsProviderProps) {
  const infra = useMediaInfra();

  const roomActions = useRoomStore((state) => state.actions);
  const mediaActions = useMediaStore((state) => state.actions);
  const streamActions = useStreamStore((state) => state.actions);

  /**
   * 시스템 준비 상태 확인
   */
  const ensureSystemReady = useCallback(() => {
    const socket = useSocketStore.getState().socket;
    const device = infra.getDevice();
    if (!socket || !socket.connected || !device) {
      throw new MediaControlError('notReady');
    }
    return { socket, device };
  }, [infra]);

  /**
   * 원격 Producer 수신
   */
  const consumeRemoteProducer = useCallback(
    async (data: NewProducerPayload) => {
      // 이미 해당 참가자의 동일 타입 스트림이 있으면 중복 consume 방지
      const existingStreams = useMediaStore.getState().remoteStreams;
      for (const stream of existingStreams.values()) {
        if (stream.participantId === data.participantId && stream.type === data.type) {
          logger.media.debug(
            `[MediaControls] 이미 consume 중인 스트림 스킵: ${data.participantId} (${data.type})`,
          );
          return;
        }
      }

      const { socket, device } = ensureSystemReady();
      const recvTransport = await infra.ensureRecvTransport(socket);

      const { stream, consumer } = await infra.consume(
        device,
        socket,
        recvTransport!,
        data.producerId,
        mediaActions.removeRemoteStream,
      );

      mediaActions.addRemoteStream(consumer.id, {
        participantId: data.participantId,
        stream,
        type: data.type,
        consumerId: consumer.id,
      });
    },
    [infra, mediaActions.addRemoteStream, mediaActions.removeRemoteStream],
  );

  /**
   * 기존 참가자들의 오디오/화면공유 한 번에 수신
   */
  const consumeExistingProducers = useCallback(async () => {
    const participants = roomActions.getParticipantList();

    const tasks = participants.flatMap((participant) => {
      const subTasks = [];
      const audioId = participant.producers.get('audio');
      const screenId = participant.producers.get('screen');

      if (audioId)
        subTasks.push(
          consumeRemoteProducer({
            producerId: audioId,
            participantId: participant.id,
            type: 'audio' as MediaType,
            kind: 'audio' as MediaKind,
            participantRole: participant.role,
          }),
        );
      if (screenId)
        subTasks.push(
          consumeRemoteProducer({
            producerId: screenId,
            participantId: participant.id,
            type: 'screen' as MediaType,
            kind: 'video' as MediaKind,
            participantRole: participant.role,
          }),
        );

      return subTasks;
    });

    if (tasks.length > 0) {
      logger.media.debug(`[MediaControls] 기존 참가자 미디어 ${tasks.length}개 수신 시작`);
      await Promise.allSettled(tasks);
    }
  }, [roomActions, consumeRemoteProducer]);

  /**
   * 오디오 활성화 (unpause 전략)
   */
  const enableMic = useCallback(async () => {
    const { socket } = ensureSystemReady();
    const isCameraOn = useMediaStore.getState().isCameraOn;

    const localStream = await streamActions.ensureTracks({ audio: true });
    const audioTrack = localStream.getAudioTracks()[0];

    // 서버 송출 또는 재개
    const existingProducer = infra.getProducer('audio');
    if (existingProducer) {
      await infra.togglePause('audio', false, socket);
    } else {
      const sendTransport = await infra.ensureSendTransport(socket);
      await infra.produce(sendTransport, audioTrack, { type: 'audio' }, socket);
    }

    streamActions.setTracksEnabled(isCameraOn, true);
    if (!useMediaStore.getState().isMicOn) mediaActions.toggleMic();
    logger.media.info('[MediaControls] 마이크 활성화 완료');
  }, [infra, ensureSystemReady, streamActions, mediaActions]);

  /**
   * 카메라 활성화
   */
  const enableCamera = useCallback(async () => {
    const { socket } = ensureSystemReady();
    const { isMicOn, isCameraOn } = useMediaStore.getState();

    const localStream = await streamActions.ensureTracks({ video: true });
    const videoTrack = localStream.getVideoTracks()[0];

    const existingProducer = infra.getProducer('video');

    // 서버 송출 또는 재개
    if (existingProducer && !existingProducer.closed) {
      await infra.togglePause('video', false, socket);
    } else {
      const sendTransport = await infra.ensureSendTransport(socket);
      await infra.produce(sendTransport, videoTrack, { type: 'video' }, socket);
    }

    streamActions.setTracksEnabled(true, isMicOn);
    if (!isCameraOn) mediaActions.toggleCamera();
    logger.media.info('[MediaControls] 카메라 활성화 완료');
  }, [infra, ensureSystemReady, streamActions, mediaActions]);

  /**
   * 화면 공유 활성화
   */
  const enableScreenShare = useCallback(async () => {
    const { socket } = ensureSystemReady();
    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch {
      logger.media.warn('[MediaControls] 화면 공유 요청 거부 또는 취소됨');
      throw new MediaControlError('screenShareDenied');
    }

    const videoTrack = stream.getVideoTracks()[0];

    videoTrack.onended = disableScreenShare;

    try {
      const sendTransport = await infra.ensureSendTransport(socket);
      await infra.produce(sendTransport, videoTrack, { type: 'screen' }, socket);

      mediaActions.setScreenStream(stream);
      mediaActions.setScreenSharing(true);

      logger.media.info('[MediaControls] 화면 공유 송출 성공');
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (error instanceof MediaControlError) throw error;
      throw new MediaControlError('unknown');
    }
  }, [infra, ensureSystemReady, mediaActions]);

  /**
   * 오디오 비활성화
   */
  const disableMic = useCallback(async () => {
    const { socket } = ensureSystemReady();
    const { isMicOn, isCameraOn } = useMediaStore.getState();

    const producer = infra.getProducer('audio');
    if (producer && !producer.paused) {
      await infra.togglePause('audio', true, socket);
    }

    streamActions.setTracksEnabled(isCameraOn, false);
    if (isMicOn) mediaActions.toggleMic();
    logger.media.info('[MediaControls] 마이크 비활성화 완료');
  }, [infra, ensureSystemReady, streamActions, mediaActions]);

  /**
   * 카메라 비활성화
   */
  const disableCamera = useCallback(async () => {
    const { socket } = ensureSystemReady();
    const { isCameraOn } = useMediaStore.getState();

    const producer = infra.getProducer('video');
    if (producer) {
      await infra.togglePause('video', true, socket);
      infra.stopProducing('video');
    }

    streamActions.stopTrack('video');
    if (isCameraOn) mediaActions.toggleCamera();
    logger.media.info('[MediaControls] 카메라 비활성화 완료');
  }, [infra, ensureSystemReady, streamActions, mediaActions]);

  /**
   * 화면 공유 비활성화
   */
  const disableScreenShare = useCallback(async () => {
    const { socket } = ensureSystemReady();

    const currentScreenStream = useMediaStore.getState().screenStream;
    if (currentScreenStream) currentScreenStream.getTracks().forEach((track) => track.stop());

    const producer = infra.getProducer('screen');
    if (producer) {
      try {
        await infra.togglePause('screen', true, socket);
      } catch (error) {
        logger.media.warn('[MediaControls] 화면 공유 Pause 알림 실패', error);
      }
      infra.stopProducing('screen');
    }

    mediaActions.setScreenStream(null);
    mediaActions.setScreenSharing(false);
    logger.media.info('[MediaControls] 화면 공유 중지');
  }, [infra, ensureSystemReady, mediaActions]);

  /**
   * 원격 스트림 수신 중지
   */
  const stopConsuming = useCallback(
    (participantId: string, type: MediaType) => {
      const remoteStreams = useMediaStore.getState().remoteStreams;
      for (const [consumerId, stream] of remoteStreams.entries()) {
        if (stream.participantId === participantId && stream.type === type) {
          infra.removeConsumer(consumerId);
          mediaActions.removeRemoteStream(consumerId);
          logger.media.debug(`[MediaControls] 스트림 정리 완료: ${participantId} (${type})`);
          return;
        }
      }
    },
    [infra, mediaActions],
  );

  /**
   * 전체 정리
   */
  const cleanup = useCallback(() => {
    // 화면 공유 스트림 정리
    const { screenStream } = useMediaStore.getState();
    if (screenStream) screenStream.getTracks().forEach((track) => track.stop());

    // 로컬 카메라/마이크 트랙 정리
    streamActions.clearStream();

    // 인프라 계층 일괄 종료 (Producer, Consumer, Transport 모두 Close)
    infra.stopAllProducers();
    infra.removeAllConsumers();
    infra.closeAllTransports();

    // 모든 전역 상태 리셋
    mediaActions.resetRemoteStreams();
    mediaActions.setScreenStream(null);
    mediaActions.setScreenSharing(false);

    // 미디어 상태 초기화
    if (useMediaStore.getState().isMicOn) mediaActions.toggleMic();
    if (useMediaStore.getState().isCameraOn) mediaActions.toggleCamera();

    logger.media.info('[MediaControls] 모든 미디어 자원 정리 완료');
  }, [infra, streamActions, mediaActions]);

  const value: MediaControlsContextType = useMemo(
    () => ({
      enableMic,
      disableMic,
      enableCamera,
      disableCamera,
      enableScreenShare,
      disableScreenShare,
      consumeRemoteProducer,
      consumeExistingProducers,
      stopConsuming,
      cleanup,
    }),
    [
      enableMic,
      disableMic,
      enableCamera,
      disableCamera,
      enableScreenShare,
      disableScreenShare,
      consumeRemoteProducer,
      consumeExistingProducers,
      stopConsuming,
      cleanup,
    ],
  );

  return <MediaControlsContext.Provider value={value}>{children}</MediaControlsContext.Provider>;
}

export function useMediaControlContext(): MediaControlsContextType {
  const context = useContext(MediaControlsContext);

  if (!context) {
    throw new Error('useMediaControlContext는 MediaControlsProvider 내부에서만 사용해야 합니다.');
  }

  return context;
}
