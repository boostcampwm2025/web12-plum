import { create } from 'zustand';
import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { RtpCapabilities } from 'mediasoup-client/types';
import { logger } from '@/shared/lib/logger';

/**
 * Mediasoup 관련 에러 코드 상수
 */
export const MEDIA_DEVICE_ERRORS = {
  NOT_SUPPORTED: 'NOT_SUPPORTED', // 브라우저가 WebRTC 또는 특정 코덱을 지원하지 않는 경우
  LOAD_FAILED: 'LOAD_FAILED', // 서버 통신 성공 후 Device.load() 과정에서 오류 발생 시
} as const;

/**
 * Mediasoup 관련 커스텀 에러 클래스
 */
export class MediaDeviceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'MediasoupError';
  }
}

interface MediaDeviceState {
  device: Device | null; // mediasoup-client 객체 (RTP Capabilities 및 통신 환경 관리)
  isLoaded: boolean; // Device가 성공적으로 로드되어 통신 준비가 되었는지 여부
  isInitializing: boolean; // Device 초기화 프로세스가 진행 중인지 여부
  actions: {
    initDevice: (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => Promise<void>;
    resetDevice: () => void;
  };
}

/**
 * 초기 상태
 */
const initialState: Pick<MediaDeviceState, 'device' | 'isLoaded' | 'isInitializing'> = {
  device: null,
  isLoaded: false,
  isInitializing: false,
};

/**
 * Mediasoup Device의 생명주기를 관리하는 전역 스토어
 */
export const useMediaDeviceStore = create<MediaDeviceState>((set, get) => ({
  ...initialState,

  actions: {
    /**
     * Mediasoup Device 초기화 프로세스
     * 1. 중복 실행 방지 체크
     * 2. Device 인스턴스 생성 (없을 경우)
     * 3. 서버에 Router RTP Capabilities 요청
     * 4. 브라우저 호환성 검사 및 Device 로드
     */
    initDevice: async (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      const { device, isLoaded, isInitializing } = get();

      // 1. 이미 로드되었거나 현재 초기화가 진행 중이라면 중복 호출을 차단
      if (isLoaded || isInitializing || (device && device.loaded)) {
        logger.media.warn('Device 초기화 중복 호출 차단됨');
        return;
      }

      // 초기화 시작 상태 설정
      set({ isInitializing: true });

      try {
        /**
         * 2. Device 인스턴스가 존재하지 않으면 새로 생성
         * 생성 단계에서 브라우저 환경을 체크하며, 지원하지 않는 환경일 경우 즉시 예외를 발생
         */
        let currentDevice = device;
        if (!currentDevice) {
          try {
            currentDevice = new Device();
            set({ device: currentDevice });
          } catch (createError: unknown) {
            const errorMessage =
              createError instanceof Error ? createError.message : 'Device 생성 실패';
            throw new MediaDeviceError(errorMessage, MEDIA_DEVICE_ERRORS.NOT_SUPPORTED);
          }
        }

        logger.media.info('Device 초기화 시작: Router RTP Capabilities 요청 중');

        /**
         * 3. 서버로부터 Router의 RTP Capabilities(지원 코덱 등) 획득
         * 소켓 자체 타임아웃이 설정되어 있으므로, 실패 시 catch 블록으로 이동
         * 클라이언트 Device가 서버와 어떤 언어(코덱)로 대화할지 결정하는 기준
         */
        const routerRtpCapabilities = await new Promise<RtpCapabilities>((resolve, reject) => {
          socket.emit('media_get_rtp_capabilities', (response: unknown) => {
            const typedResponse = response as {
              routerRtpCapabilities: RtpCapabilities;
              error?: string;
            };
            if (typedResponse.error) {
              reject(new Error(typedResponse.error));
            } else {
              resolve(typedResponse.routerRtpCapabilities);
            }
          });
        });

        /**
         * 4. Device 로드 수행
         * 내부적으로 브라우저의 WebRTC 지원 여부를 확인하고 서버의 RTP 설정과 동기화
         * 브라우저의 WebRTC 성능과 서버의 설정이 일치하는지 최종 검증
         */
        await currentDevice.load({ routerRtpCapabilities });

        /**
         * 브라우저가 오디오나 비디오 중 하나라도 보낼 수 있는 상태인지 체크
         * 둘 다 불가능하면 지원하지 않는 브라우저로 간주하여 에러 처리
         */
        if (!currentDevice.canProduce('audio') && !currentDevice.canProduce('video')) {
          set({ ...initialState });
          logger.media.error('브라우저가 WebRTC 송출을 지원하지 않음');
          const supportError = new MediaDeviceError(
            '해당 브라우저는 오디오/비디오 송출을 지원하지 않습니다.',
            MEDIA_DEVICE_ERRORS.NOT_SUPPORTED,
          );
          throw supportError;
        }

        // 상태 업데이트
        set({ isLoaded: true, isInitializing: false });
        logger.media.info('Device 로드 완료: 통신 준비됨');
      } catch (error: unknown) {
        // 에러 발생 시 초기화 중 플래그를 해제하여 재시도가 가능하도록 함
        set({ isInitializing: false });

        if (error instanceof MediaDeviceError) throw error;

        const errorMessage =
          error instanceof Error
            ? error.message
            : '미디어 디바이스 로드 중 알 수 없는 오류가 발생했습니다.';

        // MediaDeviceError로 래핑
        const loadError = new MediaDeviceError(errorMessage, MEDIA_DEVICE_ERRORS.LOAD_FAILED);

        logger.media.error('Device 로드 실패', loadError);
        throw loadError;
      }
    },

    /**
     * 스토어 상태 리셋
     * 방을 완전히 나갈 때 Device 상태를 초기화
     * 메모리 누수를 방지하고, 다음 입장 시 신규 Device 로직이 깨끗하게 시작되도록 함
     */
    resetDevice: () => {
      set({ ...initialState });
      logger.media.info('Device 상태 리셋 완료');
    },
  },
}));
