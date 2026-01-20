import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { MediaType, NewProducerPayload } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { useSocketStore } from '@/store/useSocketStore';
import { useMediaDeviceStore } from '@/store/useMediaDeviceStore';
import { useStreamStore } from '@/store/useLocalStreamStore';

import { useMediaStore } from '../stores/useMediaStore';
import { useMediaTransport } from '../mediasoup/useMediaTransport';
import { useMediaProducer } from '../mediasoup/useMediaProducer';
import { useMediaConsumer } from '../mediasoup/useMediaConsumer';
import { ProducerSignaling } from '../mediasoup/ProducerSignaling';
import { useRoomStore } from '../stores/useRoomStore';

interface MediaConnectionContextType {
  // 미디어 전송/수신 관련 기능
  startProducing: (track: MediaStreamTrack, type: MediaType) => Promise<void>;
  stopProducing: (type: MediaType) => void;
  consumeRemoteProducer: (data: NewProducerPayload) => Promise<void>;
  consumeExistingProducers: () => Promise<void>;
  cleanup: () => void;

  // 미디어 토글 기능
  startMicProducer: () => Promise<void>;
  stopMicProducer: () => void;
  startCameraProducer: () => Promise<void>;
  stopCameraProducer: () => void;

  // 화면 공유 기능
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

const MediaConnectionContext = createContext<MediaConnectionContextType | null>(null);

interface MediaConnectionProviderProps {
  children: ReactNode;
}

/**
 * 미디어 전송/수신 관련 기능을 제공 - produce, consume, 화면공유, 토글 기능 등을 포함
 * useMediaTransport, useMediaProducer, useMediaConsumer 훅들을 내부에서 사용
 * 고수준 미디어 연결 관리를 담당
 */
export function MediaConnectionProvider({ children }: MediaConnectionProviderProps) {
  // 내부 상태 및 훅
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);

  // Mediasoup 훅
  const { createTransport, closeTransports } = useMediaTransport();
  const {
    produce,
    stopProducing,
    stopAll: stopProducers,
    getProducer,
    togglePause,
  } = useMediaProducer();
  const { consume, removeAll: removeConsumers } = useMediaConsumer();

  // 외부 스토어 액션
  const { getParticipantList } = useRoomStore((state) => state.actions);
  const { setScreenSharing, setScreenStream } = useMediaStore((state) => state.actions);
  const { addRemoteStream, removeRemoteStream, resetRemoteStreams, toggleMic, toggleCamera } =
    useMediaStore((state) => state.actions);
  const { setTracksEnabled, ensureTracks, clearStream, stopTrack } = useStreamStore(
    (state) => state.actions,
  );

  /**
   * [내부] 전송/수신용 Transport 확보 공통 로직
   * 'produce' 또는 'consume' 전에 반드시 호출되어야 함
   */
  const ensureTransport = useCallback(
    async (direction: 'send' | 'recv') => {
      const socket = useSocketStore.getState().socket;
      const device = useMediaDeviceStore.getState().device;

      if (!device || !socket)
        throw new Error('연결 준비가 되지 않았습니다. 소켓과 디바이스를 확인하세요.');

      return createTransport(device, socket, direction);
    },
    [createTransport],
  );

  /**
   * 미디어 송출 시작 (Produce)
   * MediaStreamTrack과 미디어 타입을 받아 서버로 송출을 시작
   */
  const startProducing = useCallback(
    async (track: MediaStreamTrack, type: MediaType) => {
      try {
        const transport = await ensureTransport('send');
        await produce(transport, track, { type });

        logger.media.info(`[MediaConnection] ${type} 서버 송출 성공`);
      } catch (error) {
        logger.media.error(`[MediaConnection] ${type} 송출 실패:`, error);
        throw error;
      }
    },
    [ensureTransport, produce],
  );

  /**
   * 원격 Producer 수신
   * Socket 'new_producer' 이벤트 발생 시 호출
   */
  const consumeRemoteProducer = useCallback(
    async (data: NewProducerPayload) => {
      const socket = useSocketStore.getState().socket;
      const device = useMediaDeviceStore.getState().device;

      if (!device || !socket) return;
      try {
        const transport = await ensureTransport('recv');
        const { consumer, stream } = await consume(
          device,
          socket,
          transport,
          data.producerId,
          removeRemoteStream, // producer 종료 시 스토어에서 제거
        );

        const remoteStream = {
          participantId: data.participantId,
          stream,
          type: data.type,
          consumerId: consumer.id,
        };
        addRemoteStream(consumer.id, remoteStream);
      } catch (error) {
        logger.media.error(`[MediaConnection] 원격 미디어 수신 실패:`, error);
      }
    },
    [ensureTransport, consume, addRemoteStream, removeRemoteStream],
  );

  /**
   * 마이크 송출 토글 (점유 유지 + Pause/Resume 전략)
   */
  const startMicProducer = useCallback(async () => {
    try {
      const socket = useSocketStore.getState().socket;
      let localStream = useStreamStore.getState().localStream;
      let audioTrack = localStream?.getAudioTracks()[0];

      // 트랙이 없으면 확보 (최초 1회만 발생)
      if (!audioTrack || audioTrack.readyState === 'ended') {
        localStream = await ensureTracks({ audio: true });
        audioTrack = localStream.getAudioTracks()[0];
      }

      // 하드웨어 트랙 활성화
      setTracksEnabled(isCameraOn, true);

      // Mediasoup Producer 처리
      const existingProducer = getProducer('audio');
      if (existingProducer) {
        // 이미 존재하면 resume (일시정지 해제)
        togglePause('audio', false);
        // 서버에 미디어 상태 변경 알림
        if (socket) {
          await ProducerSignaling.toggleMedia(socket, existingProducer.id, 'resume', 'audio');
        }
      } else {
        // 존재하지 않으면 신규 생성 (최초 1회)
        await startProducing(audioTrack, 'audio');
      }

      if (!isMicOn) toggleMic();
      logger.media.info('[MediaConnection] 마이크 재개 완료');
    } catch (error) {
      logger.media.error('[MediaConnection] 마이크 시작 실패:', error);
    }
  }, [
    isCameraOn,
    isMicOn,
    ensureTracks,
    setTracksEnabled,
    getProducer,
    togglePause,
    startProducing,
    toggleMic,
  ]);

  /**
   * 마이크 송출 중단 (점유 유지 + Pause 전략)
   */
  const stopMicProducer = useCallback(async () => {
    try {
      const socket = useSocketStore.getState().socket;
      const producer = getProducer('audio');

      // 서버에 미디어 상태 변경 알림
      if (socket && producer) {
        await ProducerSignaling.toggleMedia(socket, producer.id, 'pause', 'audio');
      }

      // 서버 송출 일시정지 (Producer Close 대신 Pause)
      togglePause('audio', true);

      // 하드웨어 점유 유지 + 데이터 차단
      setTracksEnabled(isCameraOn, false);

      if (isMicOn) toggleMic();
      logger.media.info('[MediaConnection] 마이크 일시정지 완료');
    } catch (error) {
      logger.media.error('[MediaConnection] 마이크 중단 에러:', error);
    }
  }, [isCameraOn, isMicOn, getProducer, togglePause, setTracksEnabled, toggleMic]);
  /**
   * 카메라 송출 시작 (점유 해제 전략)
   */
  const startCameraProducer = useCallback(async () => {
    try {
      // 카메라를 다시 켤 때는 항상 신규 트랙을 확보
      logger.media.info('[MediaConnection] 카메라 트랙 신규 확보 시도');
      const localStream = await ensureTracks({ video: true });
      const videoTrack = localStream.getVideoTracks()[0];

      // UI 및 하드웨어 트랙 상태 동기화
      if (!isCameraOn) toggleCamera();
      setTracksEnabled(true, isMicOn);

      // 서버 송출 시작
      if (videoTrack) await startProducing(videoTrack, 'video');
      logger.media.info('[MediaConnection] 카메라 송출 시작 완료 (신규 획득)');
    } catch (error) {
      logger.media.error('[MediaConnection] 카메라 시작 실패:', error);
    }
  }, [isMicOn, isCameraOn, ensureTracks, toggleCamera, setTracksEnabled, startProducing]);

  /**
   * 카메라 송출 중단 (점유 해제 전략)
   */
  const stopCameraProducer = useCallback(async () => {
    try {
      const socket = useSocketStore.getState().socket;
      const producer = getProducer('video');

      // 서버에 미디어 상태 변경 알림
      if (socket && producer) {
        await ProducerSignaling.toggleMedia(socket, producer.id, 'pause', 'video');
      }

      // 서버 송출 중단
      stopProducing('video');

      // 하드웨어 점유 완전히 해제 (LED Off)
      stopTrack('video');

      // UI 상태 업데이트
      if (isCameraOn) toggleCamera();

      logger.media.info('[MediaConnection] 카메라 하드웨어 점유 해제 완료');
    } catch (error) {
      logger.media.error('[MediaConnection] 카메라 중단 에러:', error);
    }
  }, [isCameraOn, getProducer, stopProducing, stopTrack, toggleCamera]);

  /**
   * 화면 공유 중지
   */
  const stopScreenShare = useCallback(() => {
    const { screenStream: currentScreenStream } = useMediaStore.getState();
    if (currentScreenStream) {
      currentScreenStream.getTracks().forEach((track) => track.stop());
    }
    stopProducing('screen');
    setScreenStream(null);
    setScreenSharing(false);
    logger.media.info('[MediaConnection] 화면 공유 중지');
  }, [stopProducing, setScreenStream, setScreenSharing]);

  /**
   * 화면 공유 시작
   */
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const videoTrack = stream.getVideoTracks()[0];

      // 브라우저 자체 화면 공유 종료 이벤트 처리
      videoTrack.onended = stopScreenShare;
      await startProducing(videoTrack, 'screen');

      setScreenStream(stream);
      setScreenSharing(true);
      logger.media.info('[MediaConnection] 화면 공유 시작');
    } catch (error) {
      logger.media.error('[MediaConnection] 화면 공유 실패:', error);
      setScreenSharing(false);
    }
  }, [startProducing, setScreenStream, setScreenSharing, stopScreenShare]);

  /**
   * 기존 참가자들의 모든 프로듀서 수신 시도
   */
  const consumeExistingProducers = useCallback(async () => {
    const participants = getParticipantList();
    logger.media.info(`[MediaConnection] 기존 참가자 미디어 수신 시도`);

    const consumePromises: Promise<void>[] = [];

    // 각 참가자의 모든 프로듀서에 대해 수신 시도
    participants.forEach((participant) => {
      participant.producers.forEach((producerId, type) => {
        const payload: NewProducerPayload = {
          producerId,
          participantId: participant.id,
          type: type as MediaType,
          kind: type === 'audio' ? 'audio' : 'video',
          participantRole: participant.role,
        };
        consumePromises.push(consumeRemoteProducer(payload));
      });
    });

    await Promise.allSettled(consumePromises);
  }, [consumeRemoteProducer]);

  /**
   * 모든 미디어 자원 정리 (방을 나갈 때 호출)
   */
  const cleanup = useCallback(() => {
    // 화면 공유 트랙 정리
    const { screenStream: currentScreenStream } = useMediaStore.getState();
    if (currentScreenStream) {
      currentScreenStream.getTracks().forEach((track) => track.stop());
    }

    // Transport/Producer/Consumer 정리
    stopProducers();
    removeConsumers();
    closeTransports();
    resetRemoteStreams();

    // 로컬 스트림 정리
    clearStream();
    setScreenStream(null);

    // 상태 초기화
    setScreenSharing(false);

    logger.media.info('[MediaConnection] 모든 미디어 자원(Transport/Producer/Consumer) 정리 완료');
  }, [
    clearStream,
    stopProducers,
    removeConsumers,
    closeTransports,
    resetRemoteStreams,
    setScreenStream,
    setScreenSharing,
  ]);

  const value: MediaConnectionContextType = {
    startProducing,
    stopProducing,
    consumeRemoteProducer,
    consumeExistingProducers,
    cleanup,

    startMicProducer,
    stopMicProducer,
    startCameraProducer,
    stopCameraProducer,

    startScreenShare,
    stopScreenShare,
  };

  return (
    <MediaConnectionContext.Provider value={value}>{children}</MediaConnectionContext.Provider>
  );
}

/**
 * MediaConnection Context를 사용하는 훅
 */
export function useMediaConnectionContext(): MediaConnectionContextType {
  const context = useContext(MediaConnectionContext);

  if (!context) {
    throw new Error(
      'useMediaConnectionContext는 MediaConnectionProvider 내부에서만 사용해야 합니다.',
    );
  }

  return context;
}
