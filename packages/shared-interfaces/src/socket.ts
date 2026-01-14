/**
 * 서버 -> 클라이언트 이벤트
 */
export interface ServerToClientEvents {
  // 강의실 이벤트
  user_joined: (data: {
    id: string;
    name: string;
    role: 'presenter' | 'audience';
    joinedAt: Date;
  }) => void;

  user_left: (data: { id: string; name: string; leavedAt: Date }) => void;

  // Mediasoup Transport 이벤트
  transport_created: (data: {
    id: string;
    iceParameters: unknown;
    iceCandidates: unknown;
    dtlsParameters: unknown;
  }) => void;

  // Mediasoup Producer 이벤트
  produce_success: (data: { producerId: string }) => void;

  new_producer: (data: {
    producerId: string;
    participantId: string;
    kind: 'audio' | 'video' | 'screen';
  }) => void;

  producer_closed: (data: { producerId: string; participantId: string }) => void;

  // Mediasoup Consumer 이벤트
  consume_success: (data: {
    consumerId: string;
    producerId: string;
    kind: string;
    rtpParameters: unknown;
  }) => void;

  // 에러 이벤트
  error_occurred: (data: { message: string; code?: string }) => void;
}

/**
 * 클라이언트 -> 서버 이벤트
 */
export interface ClientToServerEvents {
  // Mediasoup RTP Capabilities 요청
  media_get_rtp_capabilities: (callback: (response: unknown) => void) => void;

  // Transport 생성 및 연결
  create_transport: (
    data: { direction: 'send' | 'recv' },
    callback: (response: unknown) => void,
  ) => void;

  connect_transport: (
    data: { transportId: string; dtlsParameters: unknown },
    callback: (response: unknown) => void,
  ) => void;

  // Producer 생성
  produce: (
    data: {
      transportId: string;
      kind: 'audio' | 'video' | 'screen';
      rtpParameters: unknown;
    },
    callback: (response: unknown) => void,
  ) => void;

  // Consumer 생성
  consume: (
    data: { producerId: string; rtpCapabilities: unknown },
    callback: (response: unknown) => void,
  ) => void;

  // 강의실 퇴장
  leave_room: () => void;
}
