import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Device } from 'mediasoup-client';
import { useMediaDeviceStore, MediaDeviceError } from './useMediaDeviceStore';
import { RtpCapabilities } from 'mediasoup-client/types';

vi.mock('mediasoup-client', () => ({
  Device: {
    factory: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    media: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    ui: { error: vi.fn() },
  },
}));

describe('useMediaDeviceStore', () => {
  let mockDevice: any;
  const mockRtpCapabilities = { codecs: [], headerExtensions: [] } as unknown as RtpCapabilities;

  beforeEach(() => {
    vi.clearAllMocks();
    useMediaDeviceStore.getState().actions.resetDevice();
    mockDevice = {
      load: vi.fn().mockResolvedValue(undefined),
      loaded: false,
      canProduce: vi.fn().mockReturnValue(true),
    };
    vi.mocked(Device.factory).mockResolvedValue(mockDevice);
  });

  describe('초기 상태', () => {
    it('device는 null이어야 한다', () => {
      const { device } = useMediaDeviceStore.getState();
      expect(device).toBeNull();
    });
  });

  describe('initDevice', () => {
    it('성공적으로 Device를 초기화하고 스토어에 저장한다', async () => {
      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockRtpCapabilities);

      expect(useMediaDeviceStore.getState().device).toBe(mockDevice);
      expect(Device.factory).toHaveBeenCalledTimes(1);
    });

    it('Device.load()가 routerRtpCapabilities와 함께 호출된다', async () => {
      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockRtpCapabilities);

      expect(mockDevice.load).toHaveBeenCalledWith({ routerRtpCapabilities: mockRtpCapabilities });
    });

    it('canProduce로 audio/video 지원 여부를 확인한다', async () => {
      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockRtpCapabilities);

      expect(mockDevice.canProduce).toHaveBeenCalledWith('audio');
      expect(mockDevice.canProduce).toHaveBeenCalledWith('video');
    });

    describe('중복 호출 방지', () => {
      it('이미 로드된(device.loaded === true) 경우 초기화를 건너뛴다', async () => {
        const loadedDevice = { ...mockDevice, loaded: true };
        useMediaDeviceStore.setState({ device: loadedDevice as any });

        const { actions } = useMediaDeviceStore.getState();
        await actions.initDevice(mockRtpCapabilities);

        expect(Device.factory).not.toHaveBeenCalled();
      });

      it('초기화가 이미 진행 중인 경우 Device.factory는 한 번만 호출된다', async () => {
        const { actions } = useMediaDeviceStore.getState();
        const promise1 = actions.initDevice(mockRtpCapabilities);
        const promise2 = actions.initDevice(mockRtpCapabilities);

        await Promise.all([promise1, promise2]);

        expect(Device.factory).toHaveBeenCalledTimes(1);
      });
    });

    describe('에러 처리', () => {
      it('브라우저가 지원하지 않는 환경(UnsupportedError)일 때 notSupported 에러를 던진다', async () => {
        const unsupportedError = new Error('Unsupported');
        unsupportedError.name = 'UnsupportedError';
        vi.mocked(Device.factory).mockRejectedValue(unsupportedError);

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toMatchObject({
          type: 'notSupported',
        });
      });

      it('audio와 video 모두 송출 불가능할 경우 notSupported 에러를 던진다', async () => {
        mockDevice.canProduce.mockReturnValue(false);
        vi.mocked(Device.factory).mockResolvedValue(mockDevice);

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toMatchObject({
          type: 'notSupported',
        });
      });

      it('알 수 없는 에러 발생 시 unknown 에러를 던진다', async () => {
        vi.mocked(Device.factory).mockRejectedValue(new Error('Unexpected'));

        const { actions } = useMediaDeviceStore.getState();

        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toThrow(MediaDeviceError);
        await expect(actions.initDevice(mockRtpCapabilities)).rejects.toMatchObject({
          type: 'unknown',
        });
      });
    });
  });

  describe('resetDevice', () => {
    it('모든 상태를 초기값으로 리셋한다', async () => {
      const { actions } = useMediaDeviceStore.getState();
      await actions.initDevice(mockRtpCapabilities);

      actions.resetDevice();

      const state = useMediaDeviceStore.getState();
      expect(state.device).toBeNull();
    });
  });

  describe('MediaDeviceError', () => {
    it('올바른 type을 가지고 Error 인스턴스여야 한다', () => {
      const error = new MediaDeviceError('notSupported');

      expect(error.type).toBe('notSupported');
      expect(error.name).toBe('MediaDeviceError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
