import { create } from 'zustand';
import { logger } from '@/shared/lib/logger';

interface StreamState {
  localStream: MediaStream | null;
  actions: {
    startStream: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    stopStream: () => void;
    setTracksEnabled: (video: boolean, audio: boolean) => void;
  };
}

/**
 * 전역 미디어 스트림 상태 관리 스토어
 */
export const useStreamStore = create<StreamState>((set, get) => ({
  localStream: null,
  actions: {
    /**
     * 미디어 스트림 시작
     * 사용자의 미디어 디바이스 접근 및 스트림 상태 관리
     */
    startStream: async (constraints: MediaStreamConstraints) => {
      try {
        // 기존 스트림이 있으면 중지 (기존에 열려있던 하드웨어 리소스 해제)
        const { localStream } = get();
        if (localStream) {
          logger.media.info('[StreamStore] 이전 스트림 트랙 중지');
          localStream.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        /**
         * 트랙 활성화 상태 설정 (track.enabled)
         * - true: 트랙 활성화(카메라/마이크 켜짐), 캡처된 미디어 데이터를 정상적으로 송출
         * - false: 트랙 비활성화(카메라/마이크 꺼짐)
         * 비디오: 검은색 화면을 보냄 / 오디오: 무음 프레임을 보냄
         */
        stream.getVideoTracks().forEach((track) => (track.enabled = !!constraints.video));
        stream.getAudioTracks().forEach((track) => (track.enabled = !!constraints.audio));

        set({ localStream: stream });
        return stream;
      } catch (err) {
        logger.media.error('[StreamStore] getUserMedia 에러 발생', err);
        throw err;
      }
    },

    /**
     * 미디어 스트림 완전 중지
     * 강의실 퇴장이나 앱 종료 시 하드웨어 점유를 완전히 해제
     */
    stopStream: () => {
      const { localStream } = get();
      if (localStream) {
        logger.media.info('[StreamStore] 스트림 완전 중지 및 리소스 해제');
        localStream.getTracks().forEach((track) => track.stop());
        set({ localStream: null });
      }
    },

    /**
     * 비디오/오디오 트랙 활성화 상태 설정
     * 하드웨어 장치는 끄지 않은 상태에서 데이터 송출만 제어
     *
     * 사용자가 토글을 누를 때마다 startStream을 다시 호출하는 오버헤드 방지
     * 하드웨어 리소스 재할당 및 권한 재요청 과정이 없어 UX가 부드러움
     */
    setTracksEnabled: (video: boolean, audio: boolean) => {
      const { localStream } = get();
      if (localStream) {
        logger.media.info('[StreamStore] 트랙 활성화 상태 변경', { video, audio });

        // 내장 카메라 이외의 다른 카메라 사용 시 getVideoTracks()가 여러 개일 수 있으므로 전체 순회
        localStream.getVideoTracks().forEach((track) => (track.enabled = video));
        localStream.getAudioTracks().forEach((track) => (track.enabled = audio));
      }
    },
  },
}));
