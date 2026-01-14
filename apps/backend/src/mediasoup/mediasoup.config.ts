import { RtpCodecCapability } from 'mediasoup/node/lib/types';
import * as os from 'os';

/**
 * Mediasoup 설정
 * 공식문서 참고: https://mediasoup.org/documentation/v3/mediasoup/api/
 *
 * Worker: CPU 코어별로 독립적인 프로세스 생성
 * Router: 강의실마다 생성 미디어 스트림 라우팅 담당
 * Transport: 클라이언트와 서버 간 미디어 송수신 통로
 * Producer: 클라이언트가 보냄
 * Consumer: 클라이언트가 받음
 */
export const mediasoupConfig = {
  worker: {
    rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000'), // 최소 포트
    rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '49999'), // 최대 포트
    // 로그 레벨
    logLevel: (process.env.MEDIASOUP_LOG_LEVEL || 'warn') as 'debug' | 'warn' | 'error',
    // 로그 태그
    logTags: [
      'info', // 일반 정보
      'ice', // ICE 연결 관련
      'dtls', // 암호화 관련
      'rtp', // 미디어 스트림
      'srtp', // 암호화된 RTP
      'rtcp', // RTP 제어 프로토콜
    ] as any[],
  },

  /**
   * 오디오/비디오의 세부 품질과 호환성을 정하는 옵션
   * 공식 문서: https://mediasoup.org/documentation/v3/mediasoup/api/#RouterOptions
   *
   */
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus', // 오디오 언어: Opus
        clockRate: 48000, // 샘플링 속도 (1초에 48000번 소리를 샘플링)
        channels: 2, // 채널 수 (2 = 스테레오, 1 = 모노)
      },
      {
        kind: 'video',
        mimeType: 'video/VP8', // 비디오 언어: VP8 (Chrome/Firefox)
        clockRate: 90000, // 프레임 시간 단위 (1초를 90000 단위로 나눈 값)
        parameters: {
          'x-google-start-bitrate': 1000, // 시작 비트레이트 1000kbps
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264', // 비디오 언어: H264 (Safari)
        clockRate: 90000, // 프레임 시간 단위
        parameters: {
          'packetization-mode': 1, // 패킷 전송 방식
          'profile-level-id': '42e01f', // 영상 품질/호환 레벨
          'level-asymmetry-allowed': 1, // 비대칭 레벨 허용 여부
        },
      },
    ] as RtpCodecCapability[],
  },

  // WebRTC Transport 설정
  // 브라우저랑 연결할 때 규칙과 한계치 설정
  webRtcTransport: {
    listenIps: [
      {
        // 서버가 실제로 듣는 IP (모든 인터페이스)
        ip: '0.0.0.0',

        // 클라이언트에게 알려줄 IP
        // 로컬: 127.0.0.1, 배포: 서버 공인 IP
        announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
    ],

    // 공식 문서 권장 값: https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    enableUdp: process.env.ENABLE_UDP !== 'false', // UDP on/off
    enableTcp: process.env.ENABLE_TCP !== 'false', // TCP fallback
    preferUdp: process.env.PREFER_UDP !== 'false', // UDP 우선
    initialAvailableOutgoingBitrate: 1_000_000, // 초기 1Mbps
    minimumAvailableOutgoingBitrate: 600_000, // 최소 600Kbps
    maxSctpMessageSize: 256 * 1024, // DataChannel 256KB
  },

  // Worker 개수 (CPU 코어 수 기반)
  // n: n개 Worker 생성
  // 기본값: 1
  // cpu 개수에 따라 자동 설정 + 환경변수로 조절 가능
  numWorkers:
    process.env.MEDIASOUP_WORKER_NUM === 'auto'
      ? os.cpus().length
      : parseInt(process.env.MEDIASOUP_WORKER_NUM || '1'),
};
