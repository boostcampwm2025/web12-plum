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

interface MediaConnectionContextType {
  // 미디어 전송/수신 관련 기능
  startProducing: (track: MediaStreamTrack, type: MediaType) => Promise<void>;
  stopProducing: (type: MediaType) => void;
  consumeRemoteProducer: (data: NewProducerPayload) => Promise<void>;
  cleanup: () => void;

  // 미디어 토글 기능
  toggleMicProducer: () => Promise<void>;
  toggleCameraProducer: () => Promise<void>;

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
  const { produce, stopProducing, stopAll: stopProducers } = useMediaProducer();
  const { consume, removeAll: removeConsumers } = useMediaConsumer();

  // 외부 스토어 액션
  const { setTracksEnabled, stopStream } = useStreamStore((state) => state.actions);
  const { setScreenSharing, setScreenStream } = useMediaStore((state) => state.actions);
  const { addRemoteStream, resetRemoteStreams, toggleMic, toggleCamera } = useMediaStore(
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
        const { consumer, stream } = await consume(device, socket, transport, data.producerId);

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
    [ensureTransport, consume, addRemoteStream],
  );

  /**
   * 마이크 토글
   * UI 상태, 하드웨어 트랙, Producer를 한번에 제어
   */
  const toggleMicProducer = useCallback(async () => {
    const localStream = useStreamStore.getState().localStream;
    const track = localStream?.getAudioTracks()[0];
    const nextState = !isMicOn;

    // UI 상태 업데이트
    toggleMic();

    // 하드웨어 트랙 상태 업데이트
    setTracksEnabled(isCameraOn, nextState);

    try {
      // Producer 제어
      if (nextState && track) await startProducing(track, 'audio');
      else stopProducing('audio');

      logger.media.info(`[MediaConnection] 마이크 ${nextState ? '켜짐' : '꺼짐'}`);
    } catch (error) {
      logger.media.error(`[MediaConnection] 마이크 송출 실패, 상태 복구 중:`, error);

      // 상태 복구
      toggleMic();
      setTracksEnabled(isCameraOn, isMicOn);
    }
  }, [isMicOn, isCameraOn, toggleMic, setTracksEnabled, startProducing, stopProducing]);

  /**
   * 카메라 토글
   * UI 상태, 하드웨어 트랙, Producer를 한번에 제어
   */
  const toggleCameraProducer = useCallback(async () => {
    const localStream = useStreamStore.getState().localStream;
    const track = localStream?.getVideoTracks()[0];
    const nextState = !isCameraOn;

    // UI 상태 업데이트
    toggleCamera();

    // 하드웨어 트랙 상태 업데이트
    setTracksEnabled(nextState, isMicOn);

    try {
      // Producer 제어
      if (nextState && track) await startProducing(track, 'video');
      else stopProducing('video');

      logger.media.info(`[MediaConnection] 카메라 ${nextState ? '켜짐' : '꺼짐'}`);
    } catch (error) {
      logger.media.error(`[MediaConnection] 카메라 송출 실패, 상태 복구 중:`, error);

      // 상태 복구
      toggleCamera();
      setTracksEnabled(isCameraOn, isMicOn);
    }
  }, [isCameraOn, isMicOn, toggleCamera, setTracksEnabled, startProducing, stopProducing]);

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
    stopStream();
    setScreenStream(null);

    // 상태 초기화
    setScreenSharing(false);

    logger.media.info('[MediaConnection] 모든 미디어 자원(Transport/Producer/Consumer) 정리 완료');
  }, [
    stopStream,
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
    cleanup,

    toggleMicProducer,
    toggleCameraProducer,
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
