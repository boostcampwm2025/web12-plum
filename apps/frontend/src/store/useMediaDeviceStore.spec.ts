import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Device } from 'mediasoup-client';
import { useMediaDeviceStore, MediaDeviceError, MEDIA_DEVICE_ERRORS } from './useMediaDeviceStore';

vi.mock('mediasoup-client', () => ({
  Device: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    media: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('useMediaDeviceStore', () => {
  let mockDevice: {
    load: ReturnType<typeof vi.fn>;
    loaded: boolean;
    canProduce: ReturnType<typeof vi.fn>;
  };

  let mockSocket: {
    emit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    useMediaDeviceStore.setState({
      device: null,
      isLoaded: false,
      isInitializing: false,
    });

    mockDevice = {
      load: vi.fn().mockResolvedValue(undefined),
      loaded: false,
      canProduce: vi.fn().mockReturnValue(true),
    };

    (Device as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockDevice);

    mockSocket = {
      emit: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('device는 null이어야 한다', () => {
      const { device } = useMediaDeviceStore.getState();
      expect(device).toBeNull();
    });

    it('isLoaded는 false여야 한다', () => {
      const { isLoaded } = useMediaDeviceStore.getState();
      expect(isLoaded).toBe(false);
    });

    it('isInitializing은 false여야 한다', () => {
      const { isInitializing } = useMediaDeviceStore.getState();
      expect(isInitializing).toBe(false);
    });
  });

  describe('initDevice', () => {
    it('성공적으로 Device를 초기화한다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as never);

      const state = useMediaDeviceStore.getState();
      expect(state.device).toBe(mockDevice);
      expect(state.isLoaded).toBe(true);
      expect(state.isInitializing).toBe(false);
    });

    it('Device 생성 시 new Device()를 호출한다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as never);

      expect(Device).toHaveBeenCalledTimes(1);
    });

    it('서버에서 routerRtpCapabilities를 받아온다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as never);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'media_get_rtp_capabilities',
        expect.any(Function),
      );
    });

    it('Device.load()가 routerRtpCapabilities와 함께 호출된다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as never);

      expect(mockDevice.load).toHaveBeenCalledWith({ routerRtpCapabilities });
    });

    it('canProduce로 audio/video 지원 여부를 확인한다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as never);

      expect(mockDevice.canProduce).toHaveBeenCalled();
    });

    describe('중복 호출 방지', () => {
      it('이미 로드된 경우 초기화를 건너뛴다', async () => {
        useMediaDeviceStore.setState({ isLoaded: true });

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockSocket as never);

        expect(Device).not.toHaveBeenCalled();
        expect(mockSocket.emit).not.toHaveBeenCalled();
      });

      it('초기화 진행 중인 경우 건너뛴다', async () => {
        useMediaDeviceStore.setState({ isInitializing: true });

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockSocket as never);

        expect(Device).not.toHaveBeenCalled();
        expect(mockSocket.emit).not.toHaveBeenCalled();
      });

      it('device.loaded가 true인 경우 건너뛴다', async () => {
        const loadedDevice = { ...mockDevice, loaded: true };
        useMediaDeviceStore.setState({ device: loadedDevice as never });

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockSocket as never);

        expect(mockSocket.emit).not.toHaveBeenCalled();
      });
    });

    describe('에러 처리', () => {
      it('Device 생성 실패 시 NOT_SUPPORTED 에러를 던진다', async () => {
        (Device as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw new Error('Browser not supported');
        });

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockSocket as never)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockSocket as never)).rejects.toMatchObject({
          code: MEDIA_DEVICE_ERRORS.NOT_SUPPORTED,
        });
      });

      it('서버 응답 에러 시 LOAD_FAILED 에러를 던진다', async () => {
        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              callback({ error: 'Server error' });
            }
          },
        );

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockSocket as any)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockSocket as any)).rejects.toMatchObject({
          code: MEDIA_DEVICE_ERRORS.LOAD_FAILED,
        });
      });

      it('Device.load() 실패 시 LOAD_FAILED 에러를 던진다', async () => {
        const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              callback({ routerRtpCapabilities });
            }
          },
        );

        mockDevice.load.mockRejectedValue(new Error('Load failed'));

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockSocket as never)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockSocket as never)).rejects.toMatchObject({
          code: MEDIA_DEVICE_ERRORS.LOAD_FAILED,
        });
      });

      it('audio/video 모두 지원하지 않으면 NOT_SUPPORTED 에러를 던진다', async () => {
        const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              callback({ routerRtpCapabilities });
            }
          },
        );

        mockDevice.canProduce.mockReturnValue(false);

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockSocket as never)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockSocket as never)).rejects.toMatchObject({
          code: MEDIA_DEVICE_ERRORS.NOT_SUPPORTED,
        });
      });

      it('에러 발생 시 isInitializing이 false로 리셋된다', async () => {
        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              callback({ error: 'Server error' });
            }
          },
        );

        const { actions } = useMediaDeviceStore.getState();

        try {
          await actions.initDevice(mockSocket as never);
        } catch {
          // 에러 무시
        }

        const state = useMediaDeviceStore.getState();
        expect(state.isInitializing).toBe(false);
      });
    });

    describe('상태 전이', () => {
      it('초기화 시작 시 isInitializing이 true가 된다', async () => {
        const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

        let capturedInitializingState = false;
        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              capturedInitializingState = useMediaDeviceStore.getState().isInitializing;
              callback({ routerRtpCapabilities });
            }
          },
        );

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockSocket as any);

        expect(capturedInitializingState).toBe(true);
      });

      it('초기화 완료 시 isLoaded가 true, isInitializing이 false가 된다', async () => {
        const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

        mockSocket.emit.mockImplementation(
          (event: string, callback: (response: unknown) => void) => {
            if (event === 'media_get_rtp_capabilities') {
              callback({ routerRtpCapabilities });
            }
          },
        );

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockSocket as any);

        const state = useMediaDeviceStore.getState();
        expect(state.isLoaded).toBe(true);
        expect(state.isInitializing).toBe(false);
      });
    });
  });

  describe('resetDevice', () => {
    it('모든 상태를 초기값으로 리셋한다', async () => {
      const routerRtpCapabilities = { codecs: [], headerExtensions: [] };

      mockSocket.emit.mockImplementation((event: string, callback: (response: unknown) => void) => {
        if (event === 'media_get_rtp_capabilities') {
          callback({ routerRtpCapabilities });
        }
      });

      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockSocket as any);

      actions.resetDevice();

      const state = useMediaDeviceStore.getState();
      expect(state.device).toBeNull();
      expect(state.isLoaded).toBe(false);
      expect(state.isInitializing).toBe(false);
    });

    it('초기화되지 않은 상태에서도 리셋할 수 있다', () => {
      const { actions } = useMediaDeviceStore.getState();
      actions.resetDevice();

      const state = useMediaDeviceStore.getState();
      expect(state.device).toBeNull();
      expect(state.isLoaded).toBe(false);
      expect(state.isInitializing).toBe(false);
    });
  });

  describe('MediaDeviceError', () => {
    it('올바른 code와 message를 가진다', () => {
      const error = new MediaDeviceError('테스트 에러', MEDIA_DEVICE_ERRORS.NOT_SUPPORTED);

      expect(error.message).toBe('테스트 에러');
      expect(error.code).toBe(MEDIA_DEVICE_ERRORS.NOT_SUPPORTED);
      expect(error.name).toBe('MediasoupError');
    });

    it('Error 인스턴스이다', () => {
      const error = new MediaDeviceError('테스트', MEDIA_DEVICE_ERRORS.LOAD_FAILED);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MediaDeviceError);
    });
  });
});
