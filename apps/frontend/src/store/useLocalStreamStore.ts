import { create } from 'zustand';
import { logger } from '@/shared/lib/logger';

interface StreamState {
  localStream: MediaStream | null;
  actions: {
    // 특정 미디어 타입의 트랙을 확보 (기존 스트림 유지하면서 추가/교체)
    ensureTracks: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    // 특정 트랙만 완전히 정지 (하드웨어 점유 해제)
    stopTrack: (type: 'video' | 'audio') => void;
    // 스트림 전체 종료
    clearStream: () => void;
    // 트랙 활성화 토글 (하드웨어 점유 유지)
    setTracksEnabled: (video: boolean, audio: boolean) => void;
  };
}

export const useStreamStore = create<StreamState>((set, get) => ({
  localStream: null,
  actions: {
    /**
     * 필요한 미디어 트랙을 부분적으로 가져오거나 교체
     * - 기존 스트림이 있다면 유지하면서 새로운 트랙만 끼워 넣음
     * - 카메라를 다시 켤 때나 최초 입장 시 호출됨
     */
    ensureTracks: async (constraints: MediaStreamConstraints) => {
      try {
        let { localStream } = get();

        // 새로운 하드웨어 스트림 요청
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        // 관리할 메인 스트림이 없다면 새로 생성
        if (!localStream) localStream = new MediaStream();

        /**
         * 비디오 트랙 처리
         * 카메라는 '점유 해제' 전략을 사용하므로, 켤 때마다 기존 트랙을 완전히 교체
         */
        if (constraints.video) {
          localStream.getVideoTracks().forEach((track) => {
            track.stop();
            localStream?.removeTrack(track);
          });
          localStream.addTrack(newStream.getVideoTracks()[0]);
        }

        /**
         * 오디오 트랙 처리
         * 마이크는 '점유 유지' 전략을 사용하므로, 트랙이 이미 살아있다면 교체하지 않고 유지
         */
        if (constraints.audio) {
          const existingAudio = localStream.getAudioTracks()[0];
          if (!existingAudio || existingAudio.readyState === 'ended') {
            localStream.addTrack(newStream.getAudioTracks()[0]);
          } else {
            // 이미 유효한 트랙이 있다면 새로 받아온 오디오 트랙은 즉시 종료 (리소스 누수 방지)
            newStream.getAudioTracks().forEach((track) => track.stop());
          }
        }

        // 사용하지 않은 나머지 트랙들도 정리
        newStream.getTracks().forEach((track) => {
          if (track.readyState === 'live' && !localStream?.getTracks().includes(track)) {
            track.stop();
          }
        });

        set({ localStream: new MediaStream(localStream.getTracks()) });
        return get().localStream!;
      } catch (err) {
        logger.media.warn('[StreamStore] ensureTracks 에러', err);
        throw err;
      }
    },

    /**
     * 특정 타입의 트랙을 완전히 종료하고 하드웨어 점유를 해제
     * - 카메라를 끌 때 호출하여 LED를 끄는 용도로 사용
     */
    stopTrack: (type: 'video' | 'audio') => {
      const { localStream } = get();
      if (!localStream) return;

      const tracks = type === 'video' ? localStream.getVideoTracks() : localStream.getAudioTracks();
      tracks.forEach((track) => {
        track.stop(); // 하드웨어 전원 Off
        localStream.removeTrack(track); // 스트림에서 제거
        logger.media.info(`[StreamStore] ${type} 트랙 정지 및 제거`);
      });

      set({ localStream: new MediaStream(localStream.getTracks()) });
    },

    /**
     * 모든 트랙을 중지하고 스트림을 초기화 (퇴장 시 호출)
     */
    clearStream: () => {
      const { localStream } = get();
      if (localStream) {
        logger.media.info('[StreamStore] 모든 하드웨어 점유 해제 및 스트림 초기화');
        localStream.getTracks().forEach((track) => track.stop()); // 하드웨어 전원 Off
        set({ localStream: null });
      }
    },

    /**
     * 하드웨어는 끄지 않고 데이터 송출만 제어
     * - 마이크 토글 시 즉각적인 반응을 위해 사용
     * - true: 송출 활성화 / false: 무음 및 검은 화면 송출
     */
    setTracksEnabled: (video: boolean, audio: boolean) => {
      const { localStream } = get();
      if (localStream) {
        logger.media.info('[StreamStore] 트랙 활성화 상태 변경', { video, audio });
        localStream.getVideoTracks().forEach((track) => (track.enabled = video));
        localStream.getAudioTracks().forEach((track) => (track.enabled = audio));
      }
    },
  },
}));
