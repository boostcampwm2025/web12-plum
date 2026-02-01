import { Device } from 'mediasoup-client';
import type { Consumer, Producer, RtpCapabilities, Transport } from 'mediasoup-client/types';
import type { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

type TransportDirection = 'send' | 'recv';

/**
 * Mediasoup 클라이언트 상태 관리 클래스
 * Device, Transport, Producer, Consumer 등의 인스턴스를 관리
 */
export class MediasoupClient {
  private static device: Device | null = null;
  private static deviceInitPromise: Promise<Device> | null = null;

  private static sendTransport: Transport | null = null;
  private static recvTransport: Transport | null = null;

  private static producers = new Map<MediaType, Producer>();

  // consumerId -> Consumer
  private static consumers = new Map<string, Consumer>();
  // consumerId -> MediaStream
  private static streams = new Map<string, MediaStream>();

  /** 반드시 존재하는 Device 반환 */
  static getRequiredDevice(): Device {
    if (!this.device) throw new Error('[Device] 미디어 장치가 초기화되지 않음');
    return this.device;
  }

  /**
   * Device 초기화
   * device가 이미 로드된 경우 재사용
   * 초기화 진행 중인 경우 해당 Promise 반환
   */
  static async initDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
    if (this.device?.loaded) return this.device;
    if (this.deviceInitPromise) return this.deviceInitPromise;

    try {
      // Device 인스턴스 생성 및 로드
      this.deviceInitPromise = this.loadDevice(routerRtpCapabilities);
      return await this.deviceInitPromise;
    } finally {
      this.deviceInitPromise = null;
    }
  }

  /** 실제 Mediasoup Device 객체를 생성하고 로드 */
  private static async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
    try {
      // Device 생성
      const currentDevice = await Device.factory();
      await currentDevice.load({ routerRtpCapabilities });

      // 송출 가능 여부 확인
      const canProduceAudio = currentDevice.canProduce('audio');
      const canProduceVideo = currentDevice.canProduce('video');

      if (!canProduceAudio && !canProduceVideo) {
        throw new Error('[Device] 브라우저가 오디오/비디오 송출 기능을 지원하지 않음');
      }

      this.device = currentDevice;
      logger.media.info('[Device] 초기화 및 검증 완료');
      return currentDevice;
    } catch (error) {
      if (this.device) this.device = null;

      const isUnsupported = error instanceof Error && error.name === 'UnsupportedError';
      const errorMessage = isUnsupported
        ? '[Device] 오디오/비디오 송출을 지원하지 않음'
        : '[Device] 알 수 없는 오류로 초기화 실패';

      logger.media.error(`[Device] ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /** 송출용 Transport 반환 */
  static getSendTransport(): Transport | null {
    return this.sendTransport;
  }

  /** 수신용 Transport 반환 */
  static getRecvTransport(): Transport | null {
    return this.recvTransport;
  }

  /** 송출용 Transport 보장 */
  static getRequiredSendTransport(): Transport {
    if (!this.sendTransport || this.sendTransport.closed) {
      throw new Error('[Transport] 송출용 트랜스포트가 없거나 닫혀있음');
    }

    return this.sendTransport!;
  }

  /** 송출용 Transport 설정 */
  static setSendTransport(transport: Transport): void {
    this.sendTransport = transport;
    this.bindTransportCleanup(transport, 'send');
  }

  /** 수신용 Transport 설정 */
  static setRecvTransport(transport: Transport): void {
    this.recvTransport = transport;
    this.bindTransportCleanup(transport, 'recv');
  }

  /** Transport 정리 이벤트 바인딩 */
  private static bindTransportCleanup(transport: Transport, direction: TransportDirection): void {
    // 연결 상태 변화 감지 이벤트 바인딩
    transport.on('connectionstatechange', (state: string) => {
      if (state === 'failed' || state === 'closed') {
        if (direction === 'send') this.sendTransport = null;
        else this.recvTransport = null;
        logger.media.debug(`[Transport] ${direction} 상태 변경: ${state}`);
      }
    });

    // 연결 성공 로깅
    transport.on('connect', () => {
      logger.media.info(`[Transport:${direction}] DTLS 연결 성공`);
    });
  }

  /** 모든 Transport 종료 */
  static closeAllTransports(): void {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    logger.media.debug('[Transport] 모든 Transport 정리 완료');
  }

  /** 특정 타입의 Producer 반환 */
  static getProducer(type: MediaType): Producer | null {
    return this.producers.get(type) ?? null;
  }

  /** 모든 Producer 반환 */
  static getAllProducers(): Map<MediaType, Producer> {
    return this.producers;
  }

  /** Producer 등록 */
  static setProducer(type: MediaType, producer: Producer): void {
    this.producers.set(type, producer);

    // 트랜스포트가 닫히면 프로듀서도 자동으로 정리되도록 설정
    producer.on('transportclose', () => {
      logger.media.debug(`[Producer] ${type} 트랜스포트 종료로 인한 정리`);
      this.producers.delete(type);
    });

    // 트랙 자체가 끝나면(카메라 끄기 등) 정리
    producer.on('trackended', () => {
      logger.media.debug(`[Producer] ${type} 트랙 종료로 인한 정리`);
      this.removeProducerLocally(type);
    });
  }

  /** Producer 제거 */
  static removeProducerLocally(type: MediaType): void {
    const producer = this.producers.get(type);
    if (producer && !producer.closed) producer.close();
    this.producers.delete(type);
  }

  /**
   * 모든 로컬 Producer를 물리적으로 종료하고 리스트에서 제거
   * @returns 종료된 Producer들의 ID 목록
   */
  static closeAllProducersLocally(): string[] {
    const producerIds: string[] = [];

    this.producers.forEach((producer) => {
      if (producer.closed) return;

      producerIds.push(producer.id);
      producer.close();
    });

    this.producers.clear();
    return producerIds;
  }

  /**
   * 특정 Producer 일시정지/재개 (로컬 전용)
   * @return 변경된 Producer ID 또는 null
   */
  static toggleProducerLocally(type: MediaType, pause: boolean): string | null {
    const producer = this.getProducer(type);
    if (!producer) return null;

    if (pause) producer.pause();
    else producer.resume();

    return producer.id;
  }

  /** 모든 Producer 정리 */
  static clearAllProducers(): void {
    this.producers.forEach((producer) => {
      if (!producer.closed) producer.close();
    });
    this.producers.clear();
    logger.media.debug('[Producer] 모든 Producer 정리 완료');
  }

  /** 특정 Consumer 반환 */
  static getConsumer(consumerId: string): Consumer | null {
    return this.consumers.get(consumerId) ?? null;
  }

  /** 특정 Consumer의 MediaStream 반환 */
  static getStream(consumerId: string): MediaStream | null {
    return this.streams.get(consumerId) ?? null;
  }

  /** Consumer 등록 */
  static setConsumer(consumer: Consumer, stream: MediaStream): void {
    this.consumers.set(consumer.id, consumer);
    this.streams.set(consumer.id, stream);

    // 트랜스포트가 닫히면 컨슈머도 자동으로 정리되도록 설정
    consumer.on('transportclose', () => {
      logger.media.debug(`[Consumer] ${consumer.id} 트랜스포트 종료로 인한 정리`);
      this.removeConsumerLocally(consumer.id);
    });

    // 트랙 자체가 끝나면 정리
    consumer.on('trackended', () => {
      logger.media.debug(`[Consumer] ${consumer.id} 트랙 종료로 인한 정리`);
      this.removeConsumerLocally(consumer.id);
    });
  }

  /**
   * 특정 Consumer를 로컬에서 물리적으로 종료 및 삭제
   * @returns 삭제된 Consumer의 ID (서버 통신용)
   */
  static removeConsumerLocally(consumerId: string): string | null {
    const consumer = this.consumers.get(consumerId);
    const stream = this.streams.get(consumerId);

    // Consumer 종료 및 맵에서 제거
    if (consumer) {
      if (!consumer.closed) consumer.close();
      this.consumers.delete(consumerId);
    }

    // 스트림 내의 모든 트랙을 명시적으로 중지
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.streams.delete(consumerId);
    }

    return consumerId;
  }

  /**
   * 모든 로컬 Consumer 정리
   * @returns 종료된 모든 Consumer ID 배열
   */
  static closeAllConsumersLocally(): string[] {
    const consumerIds = Array.from(this.consumers.keys());

    this.consumers.forEach((consumer) => {
      if (!consumer.closed) consumer.close();
    });

    this.consumers.clear();
    this.streams.clear();

    return consumerIds;
  }

  /** 모든 Consumer 정리 */
  static clearAllConsumers(): void {
    this.consumers.forEach((consumer) => consumer.close());
    this.consumers.clear();
    this.streams.clear();
    logger.media.debug('[Consumer] 모든 Consumer 정리 완료');
  }

  /** 모든 리소스 정리 */
  static cleanup(): void {
    this.clearAllProducers();
    this.clearAllConsumers();
    this.closeAllTransports();

    this.device = null;
    this.deviceInitPromise = null;
    logger.media.info('[MediasoupClient] 모든 리소스 정리 완료');
  }
}
