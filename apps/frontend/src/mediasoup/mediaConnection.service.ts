import type { RtpCapabilities, Transport } from 'mediasoup-client/types';
import type { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

import { MediasoupService, type MediaEventHandlers } from './mediasoup.service';
import { MediasoupClient } from './client';

type TransportDirection = 'send' | 'recv';

/**
 * 미디어 연결을 관리하는 서비스
 * MediaService(서버 통신)와 MediasoupClient(클라이언트 상태)를 조합하여
 * Device, Transport, Consumer 관련 핵심 로직을 제공합니다.
 */
export class MediaConnectionService {
  /** 전체 연결 초기화 (Device + Transports) */
  static async initialize(rtpCapabilities: RtpCapabilities) {
    try {
      await MediasoupClient.initDevice(rtpCapabilities);
      await Promise.all([this.createTransport('send'), this.createTransport('recv')]);
    } catch (error) {
      logger.media.error('[MediaConnection] 미디어 연결 초기화 실패', error);
      this.cleanup();
      throw error;
    }
  }

  /** Transport 생성 및 내부 이벤트 바인딩 */
  private static async createTransport(direction: TransportDirection): Promise<Transport> {
    const device = MediasoupClient.getRequiredDevice();

    // 서버에서 Transport 파라미터 요청
    const { success: _, ...data } = await MediasoupService.createTransport({ direction });

    // Transport 인스턴스 생성
    const transport =
      direction === 'send' ? device.createSendTransport(data) : device.createRecvTransport(data);
    this.bindTransportEvents(transport, direction);

    if (direction === 'send') MediasoupClient.setSendTransport(transport);
    else MediasoupClient.setRecvTransport(transport);

    logger.media.debug(`[MediaConnection] ${direction} Transport 구축 완료`, { id: transport.id });
    return transport;
  }

  /**
   * Mediasoup Transport의 이벤트를 서버 서비스와 연결
   */
  private static bindTransportEvents(transport: Transport, direction: TransportDirection): void {
    // DTLS 연결 이벤트
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await MediasoupService.connectTransport({ transportId: transport.id, dtlsParameters });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    // 미디어 송출 이벤트 (Send전용)
    if (direction !== 'send') return;
    transport.on('produce', async ({ rtpParameters, appData }, callback, errback) => {
      try {
        const { producerId } = await MediasoupService.produce({
          transportId: transport.id,
          rtpParameters,
          type: appData.type as MediaType,
        });
        callback({ id: producerId });
      } catch (error) {
        errback(error as Error);
      }
    });
  }

  /** 원격 Producer를 수신하여 Consumer 생성 */
  static async startConsuming(producerId: string) {
    const device = MediasoupClient.getRequiredDevice();
    let recvTransport = MediasoupClient.getRecvTransport();

    // 수신용 Transport가 없으면 생성
    if (!recvTransport || recvTransport.closed) {
      recvTransport = await this.createTransport('recv');
    }

    // 서버에 수신 요청
    const { consumerId, kind, rtpParameters } = await MediasoupService.consume({
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    // 로컬 Consumer 생성
    const payload = { id: consumerId, producerId, kind, rtpParameters };
    const consumer = await recvTransport.consume(payload);

    // 수신 트랙으로 Stream 생성 및 저장
    const stream = new MediaStream([consumer.track]);
    MediasoupClient.setConsumer(consumer, stream);

    // 서버에 Resume 요청
    await MediasoupService.consumeResume({ consumerId });

    return { consumer, stream };
  }

  /**
   * 특정 Consumer 정리
   */
  static removeConsumer(consumerId: string) {
    return MediasoupClient.removeConsumerLocally(consumerId);
  }

  /**
   * 미디어 이벤트 핸들러 등록
   */
  static setupMediaEventHandlers(handlers: MediaEventHandlers) {
    return MediasoupService.setupEventHandlers(handlers);
  }

  /**
   * 미디어 이벤트 핸들러 해제
   */
  static removeMediaEventHandlers() {
    MediasoupService.removeEventHandlers();
  }

  /** 특정 타입의 Producer 조회 */
  static getProducer(type: MediaType) {
    return MediasoupClient.getProducer(type);
  }

  /** 미디어 트랙을 서버로 송출 */
  static async startProducing(track: MediaStreamTrack, type: MediaType) {
    const sendTransport = MediasoupClient.getRequiredSendTransport();
    const producer = await sendTransport.produce({ track, appData: { type } });

    MediasoupClient.setProducer(type, producer);
    logger.media.debug(`[MediaConnectionService] Producer 생성 완료: ${type}`, { id: producer.id });

    return producer;
  }

  /** 특정 타입의 미디어 송출 중단 */
  static async stopProducing(type: MediaType) {
    const producer = MediasoupClient.getProducer(type);
    if (!producer) return;

    await MediasoupService.closeProducer({ producerId: producer.id });
    MediasoupClient.removeProducerLocally(type);
    logger.media.debug(`[MediaConnectionService] Producer 종료 완료: ${type}`);
  }

  /** 특정 미디어 일시정지/재개 */
  static async toggleProducer(type: MediaType, pause: boolean) {
    // 로컬 객체 상태 변경
    const producerId = MediasoupClient.toggleProducerLocally(type, pause);
    if (!producerId) return;

    // 서버에 상태 변경 알림
    try {
      const action = pause ? 'pause' : 'resume';
      await MediasoupService.toggleMedia({ producerId, type, action });
      logger.media.debug(`[MediaConnectionService] ${type} 송출 ${pause ? '일시정지' : '재개'}`);
    } catch (error) {
      logger.media.error(`[MediaConnectionService] ${type} 서버 통신 실패로 인한 롤백`, error);
      MediasoupClient.toggleProducerLocally(type, !pause);
      throw error;
    }
  }

  /** 모든 Producer 종료 (서버 통신 포함) */
  static async stopAllProducers() {
    const producerIds = MediasoupClient.closeAllProducersLocally();

    await Promise.allSettled(
      producerIds.map((id) => MediasoupService.closeProducer({ producerId: id })),
    );

    return producerIds;
  }

  /** 모든 Consumer 종료 (서버 통신 포함) */
  static async stopAllConsumers() {
    const consumerIds = MediasoupClient.closeAllConsumersLocally();

    await Promise.allSettled(
      consumerIds.map((id) => MediasoupService.closeConsumer({ consumerId: id })),
    );

    return consumerIds;
  }

  /** 미디어 리소스 정리 */
  static cleanup() {
    MediasoupService.removeEventHandlers();
    MediasoupClient.cleanup();
    logger.media.info('[MediaConnectionService] 미디어 연결 리소스 정리 완료');
  }
}
