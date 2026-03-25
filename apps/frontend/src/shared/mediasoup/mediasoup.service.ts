import type {
  CloseConsumerRequest,
  CloseProducerRequest,
  ConnectTransportRequest,
  ConsumerClosedPayload,
  ConsumeRequest,
  ConsumeResumeRequest,
  CreateTransportRequest,
  MediaStateChangedPayload,
  NewProducerPayload,
  ProducerClosedPayload,
  ProduceRequest,
  ToggleMediaRequest,
} from '@plum/shared-interfaces';

import { SocketClient } from '@/shared/socket/client';

/**
 * 미디어 서비스 이벤트 핸들러 인터페이스
 */
export interface MediaEventHandlers {
  onNewProducer: (data: NewProducerPayload) => void;
  onProducerClosed: (data: ProducerClosedPayload) => void;
  onConsumerClosed: (data: ConsumerClosedPayload) => void;
  onMediaStateChanged: (data: MediaStateChangedPayload) => void;
}

/**
 * 미디어 관련 서버 통신 서비스
 * SocketClient를 사용하여 mediasoup 관련 소켓 I/O를 처리
 */
export class MediasoupService {
  private static unsubscribers: (() => void)[] = [];

  /** 서버 측 WebRTC transport 생성 요청 */
  static async createTransport(payload: CreateTransportRequest) {
    return await SocketClient.emitWithAck('create_transport', payload);
  }

  /** 클라이언트 transport와 서버 transport 연결 요청 */
  static async connectTransport(payload: ConnectTransportRequest) {
    return await SocketClient.emitWithAck('connect_transport', payload);
  }

  /** 미디어 데이터를 송출(produce)하기 위한 요청 */
  static async produce(payload: ProduceRequest) {
    return await SocketClient.emitWithAck('produce', payload);
  }

  /** 미디어 상태 변경 요청 (pause/resume) */
  static async toggleMedia(payload: ToggleMediaRequest) {
    return await SocketClient.emitWithAck('toggle_media', payload);
  }

  /** Producer 종료 요청 */
  static async closeProducer(payload: CloseProducerRequest) {
    return await SocketClient.emitWithAck('close_producer', payload);
  }

  /** 다른 참여자의 미디어를 수신(consume)하기 위한 요청 */
  static async consume(payload: ConsumeRequest) {
    return await SocketClient.emitWithAck('consume', payload);
  }

  /** 일시 중지된 Consumer 재개 요청 */
  static async consumeResume(payload: ConsumeResumeRequest) {
    return await SocketClient.emitWithAck('consume_resume', payload);
  }

  /** 특정 Consumer 종료 요청 */
  static async closeConsumer(payload: CloseConsumerRequest) {
    return await SocketClient.emitWithAck('close_consumer', payload);
  }

  /** 미디어 서비스 이벤트 핸들러 등록 */
  static setupEventHandlers(handlers: MediaEventHandlers) {
    this.removeEventHandlers();

    this.unsubscribers = [
      SocketClient.on('new_producer', handlers.onNewProducer),
      SocketClient.on('producer_closed', handlers.onProducerClosed),
      SocketClient.on('consumer_closed', handlers.onConsumerClosed),
      SocketClient.on('media_state_changed', handlers.onMediaStateChanged),
    ];
  }

  /** 등록된 모든 미디어 이벤트 리스너 해제 */
  static removeEventHandlers() {
    if (this.unsubscribers.length === 0) return;

    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
