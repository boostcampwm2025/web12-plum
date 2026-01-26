import { useCallback, useMemo } from 'react';
import type { Device, RtpCapabilities, Transport } from 'mediasoup-client/types';

import { MediaSocket } from '@/feature/room/types';

import { useMediaTransport } from '../mediasoup/useMediaTransport';
import { useMediaProducer } from '../mediasoup/useMediaProducer';
import { useMediaConsumer } from '../mediasoup/useMediaConsumer';
import { logger } from '@/shared/lib/logger';
import { useMediaDeviceStore } from './useMediaDeviceStore';

/**
 * Media Infra 오류 메시지 매핑
 */
const ERROR_MESSAGES = {
  deviceUnavailable: '미디어 장치가 사용 불가능합니다.',
  connectFailed: '연결 중 오류가 발생했습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * Media Infra 오류 클래스
 */
export class MediaInfraError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;

    super(message);
    this.name = 'MediaInfraError';
    this.type = type;

    logger.ui.error('[MediaInfra]', message);
  }
}

interface InfraResult {
  // Device 관련
  initDevice: (routerRtpCapabilities: RtpCapabilities) => Promise<Device>;
  getDevice: () => Device | null;

  // Transport 확보
  ensureSendTransport: (socket: MediaSocket) => Promise<Transport>;
  ensureRecvTransport: (socket: MediaSocket) => Promise<Transport>;

  // Transport 정리
  closeAllTransports: () => void;

  // Producer 관련
  produce: ReturnType<typeof useMediaProducer>['produce'];
  stopProducing: ReturnType<typeof useMediaProducer>['stopProducing'];
  stopAllProducers: ReturnType<typeof useMediaProducer>['stopAllProducers'];
  getProducer: ReturnType<typeof useMediaProducer>['getProducer'];
  togglePause: ReturnType<typeof useMediaProducer>['togglePause'];

  // Consumer 관련
  consume: ReturnType<typeof useMediaConsumer>['consume'];
  removeConsumer: ReturnType<typeof useMediaConsumer>['removeConsumer'];
  removeAllConsumers: ReturnType<typeof useMediaConsumer>['removeAllConsumers'];
}

/**
 * Device / Transport / Producer / Consumer를 한 번에 다루는 인프라 훅
 */
export const useMediaInfra = (): InfraResult => {
  const producerApi = useMediaProducer();
  const consumerApi = useMediaConsumer();

  const { createTransport, closeAllTransports } = useMediaTransport();

  const getDevice = useCallback(() => useMediaDeviceStore.getState().device, []);
  const initDevice = useMediaDeviceStore((state) => state.actions.initDevice);

  /**
   * 장치 및 소켓 상태 통합 검증
   */
  const validateSystemReady = useCallback(
    (socket: MediaSocket) => {
      const device = getDevice();
      if (!device) throw new MediaInfraError('deviceUnavailable');
      if (!socket || !socket.connected) throw new MediaInfraError('connectFailed');
      return device;
    },
    [getDevice],
  );

  /**
   * 송신용 Transport 확보
   */
  const ensureSendTransport = useCallback(
    async (socket: MediaSocket) => {
      const device = validateSystemReady(socket);
      return createTransport(socket, device, 'send');
    },
    [getDevice, createTransport],
  );

  /**
   * 수신용 Transport 확보
   */
  const ensureRecvTransport = useCallback(
    async (socket: MediaSocket) => {
      const device = validateSystemReady(socket);
      return createTransport(socket, device, 'recv');
    },
    [getDevice, createTransport],
  );

  return useMemo(
    () => ({
      initDevice,
      getDevice,
      ensureSendTransport,
      ensureRecvTransport,
      closeAllTransports,

      // Producer API
      produce: producerApi.produce,
      stopProducing: producerApi.stopProducing,
      stopAllProducers: producerApi.stopAllProducers,
      getProducer: producerApi.getProducer,
      togglePause: producerApi.togglePause,

      // Consumer API
      consume: consumerApi.consume,
      removeConsumer: consumerApi.removeConsumer,
      removeAllConsumers: consumerApi.removeAllConsumers,
    }),
    [
      initDevice,
      getDevice,
      ensureSendTransport,
      ensureRecvTransport,
      closeAllTransports,
      producerApi,
      consumerApi,
    ],
  );
};
