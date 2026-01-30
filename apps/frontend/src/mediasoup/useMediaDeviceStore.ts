import { create } from 'zustand';
import { Device } from 'mediasoup-client';
import { RtpCapabilities } from 'mediasoup-client/types';

import { logger } from '@/shared/lib/logger';

/**
 * MediaDevice 오류 메시지 매핑
 */
const ERROR_MESSAGES = {
  notSupported: '브라우저가 오디오/비디오 송출을 지원하지 않습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * MediaDevice 관련 오류 클래스
 */
export class MediaDeviceError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;

    super(message);
    this.name = 'MediaDeviceError';
    this.type = type;

    logger.ui.error('[MediaDevice]', message);
  }
}

interface MediaDeviceActions {
  initDevice: (routerRtpCapabilities: RtpCapabilities) => Promise<Device>;
  resetDevice: () => void;
}

interface MediaDeviceState {
  device: Device | null; // mediasoup-client 객체 (RTP Capabilities 및 통신 환경 관리)
  actions: MediaDeviceActions;
}

/**
 * 초기 상태
 */
const initialState: Omit<MediaDeviceState, 'actions'> = {
  device: null,
};

/**
 * Device 초기화 진행 중인 Promise를 저장하는 변수
 * 중복 초기화 요청을 방지하기 위해 사용
 */
let initializationPromise: Promise<Device> | null = null;

/**
 * Mediasoup Device의 생명주기를 관리하는 전역 스토어
 */
export const useMediaDeviceStore = create<MediaDeviceState>((set, get) => ({
  ...initialState,

  actions: {
    /**
     * Mediasoup Device 초기화 프로세스
     * 1. 중복 실행 방지 체크
     * 2. Device 인스턴스 생성
     * 3. 브라우저 호환성 검사 및 Device 로드
     *
     * @param routerRtpCapabilities 강의실 생성/입장 API 응답에서 전달받은 Router RTP Capabilities
     */
    initDevice: async (routerRtpCapabilities) => {
      const { device } = get();

      // 이미 로드된 Device가 있으면 반환
      if (device?.loaded) {
        logger.media.info('[Device] Device 초기화 중복 호출 차단됨');
        return device;
      }

      // 초기화 진행 중이면 실패 반환
      if (initializationPromise) {
        logger.media.info('[Device] Device 초기화 진행 중');
        return initializationPromise;
      }

      initializationPromise = (async () => {
        try {
          const currentDevice = await Device.factory();
          await currentDevice.load({ routerRtpCapabilities });

          // 브라우저가 오디오/비디오 송출을 지원하는지 검사
          const canProduceAudio = currentDevice.canProduce('audio');
          const canProduceVideo = currentDevice.canProduce('video');

          if (!canProduceAudio && !canProduceVideo) {
            throw new MediaDeviceError('notSupported');
          }

          set({ device: currentDevice });
          logger.media.info('[Device] Device 로드 완료');

          return currentDevice;
        } catch (error) {
          if (error instanceof MediaDeviceError) {
            throw error;
          }

          const isUnsupported = error instanceof Error && error.name === 'UnsupportedError';
          throw new MediaDeviceError(isUnsupported ? 'notSupported' : 'unknown');
        } finally {
          initializationPromise = null;
        }
      })();

      return initializationPromise;
    },
    /**
     * 스토어 상태 리셋
     * 방을 완전히 나갈 때 Device 상태를 초기화
     * 메모리 누수를 방지하고, 다음 입장 시 신규 Device 로직이 깨끗하게 시작되도록 함
     */
    resetDevice: () => {
      set({ ...initialState });
      logger.media.info('[Device] 상태 리셋 완료');
    },
  },
}));
