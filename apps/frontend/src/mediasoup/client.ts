import { Device } from 'mediasoup-client';
import type { Consumer, Producer, RtpCapabilities, Transport } from 'mediasoup-client/types';
import type { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

type TransportDirection = 'send' | 'recv';

/**
 * 브라우저 내 mediasoup 객체들의 상태를 관리하는 클래스
 *
 * 서버 통신 없이 로컬에서 mediasoup 관련 객체들을 저장하고 관리
 * MediaConnectionService가 이 클래스를 통해 상태를 조회/변경
 *
 * 관리 대상:
 * - Device: 브라우저의 미디어 기능을 추상화한 객체 (싱글톤)
 * - Transport: 미디어 데이터가 오가는 WebRTC 연결 통로 (send/recv 각 1개)
 * - Producer: 내가 송출 중인 미디어 (video/audio/screen별로 관리)
 * - Consumer: 다른 사람에게서 수신 중인 미디어 (consumerId별로 관리)
 * - Stream: Consumer의 트랙을 담은 MediaStream (<video>에 연결용)
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

  /**
   * 초기화된 Device 반환 (없으면 에러)
   *
   * Device가 반드시 필요한 작업(Transport 생성 등)에서 사용
   * 초기화 전에 호출하면 에러가 발생하므로, initDevice() 이후에 사용할 것
   */
  static getRequiredDevice(): Device {
    if (!this.device) throw new Error('[Device] 미디어 장치가 초기화되지 않음');
    return this.device;
  }

  /**
   * Device 초기화 (최초 1회만 실행)
   *
   * 서버의 RTP 설정을 받아 브라우저 미디어 기능을 준비
   * 이미 초기화됐으면 기존 Device를 반환하고, 동시에 여러 번 호출해도 중복 초기화되지 않음
   *
   * @param routerRtpCapabilities 서버에서 받은 코덱/포맷 설정
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

  /**
   * 실제 Device 객체 생성 및 브라우저 호환성 검증
   *
   * Device를 생성하고 서버 설정으로 로드한 뒤, 브라우저가 오디오/비디오 송출을 지원하는지 확인
   * 지원하지 않는 브라우저면 에러를 발생시킴
   */
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

  /** 송출용 Transport 반환 (없으면 null) */
  static getSendTransport(): Transport | null {
    return this.sendTransport;
  }

  /** 수신용 Transport 반환 (없으면 null) */
  static getRecvTransport(): Transport | null {
    return this.recvTransport;
  }

  /**
   * 송출용 Transport 반환 (없거나 닫혔으면 에러)
   *
   * Producer 생성 등 반드시 Transport가 필요한 작업에서 사용
   */
  static getRequiredSendTransport(): Transport {
    if (!this.sendTransport || this.sendTransport.closed) {
      throw new Error('[Transport] 송출용 트랜스포트가 없거나 닫혀있음');
    }

    return this.sendTransport!;
  }

  /**
   * 송출용 Transport 저장
   *
   * Transport 생성 후 호출하여 내부 상태에 저장
   * 연결 끊김 감지를 위한 이벤트도 자동으로 바인딩됨
   */
  static setSendTransport(transport: Transport): void {
    this.sendTransport = transport;
    this.bindTransportCleanup(transport, 'send');
  }

  /**
   * 수신용 Transport 저장
   *
   * Transport 생성 후 호출하여 내부 상태에 저장
   * 연결 끊김 감지를 위한 이벤트도 자동으로 바인딩됨
   */
  static setRecvTransport(transport: Transport): void {
    this.recvTransport = transport;
    this.bindTransportCleanup(transport, 'recv');
  }

  /**
   * Transport 상태 변화 감지 이벤트 바인딩
   *
   * WebRTC 연결이 끊기거나 실패하면 자동으로 내부 참조를 정리
   * 이를 통해 닫힌 Transport를 사용하려는 시도를 방지
   */
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

  /**
   * 모든 Transport 종료
   *
   * 방 퇴장 시 send/recv Transport를 모두 닫고 참조를 정리함
   */
  static closeAllTransports(): void {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    logger.media.debug('[Transport] 모든 Transport 정리 완료');
  }

  /**
   * 특정 타입의 Producer 반환
   *
   * @param type 'video' | 'audio' | 'screen'
   * @returns 해당 타입의 Producer (없으면 null)
   */
  static getProducer(type: MediaType): Producer | null {
    return this.producers.get(type) ?? null;
  }

  /** 모든 Producer Map 반환 (디버깅/상태 확인용) */
  static getAllProducers(): Map<MediaType, Producer> {
    return this.producers;
  }

  /**
   * Producer 등록 및 자동 정리 이벤트 바인딩
   *
   * 새 Producer를 저장하고, Transport가 닫히거나 트랙이 종료되면 자동으로 정리되도록 이벤트 연결함
   * (예: 사용자가 브라우저에서 직접 카메라를 끄는 경우)
   */
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

  /**
   * 특정 Producer를 로컬에서 종료 및 제거
   *
   * Producer를 물리적으로 close하고 Map에서 삭제
   * 서버 통신은 하지 않으므로, 서버 알림은 별도로 처리해야 함
   */
  static removeProducerLocally(type: MediaType): void {
    const producer = this.producers.get(type);
    if (producer && !producer.closed) producer.close();
    this.producers.delete(type);
  }

  /**
   * 모든 Producer를 로컬에서 일괄 종료
   *
   * 방 퇴장 시 모든 송출을 중단
   * 종료된 Producer ID 목록을 반환하여 서버에 알릴 수 있게 함
   *
   * @returns 종료된 Producer ID 배열 (서버 closeProducer 호출용)
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
   *
   * 마이크 뮤트, 카메라 끄기 등 일시적 중단에 사용
   * Producer 자체는 유지되므로 빠르게 재개할 수 있음
   *
   * @returns Producer ID (서버 알림용) 또는 null (Producer 없음)
   */
  static toggleProducerLocally(type: MediaType, pause: boolean): string | null {
    const producer = this.getProducer(type);
    if (!producer) return null;

    if (pause) producer.pause();
    else producer.resume();

    return producer.id;
  }

  /**
   * 모든 Producer 정리 (ID 반환 없음)
   *
   * cleanup() 내부에서 사용되는 단순 정리 메서드
   * 서버 통신 없이 로컬만 정리할 때 사용함
   */
  static clearAllProducers(): void {
    this.producers.forEach((producer) => {
      if (!producer.closed) producer.close();
    });
    this.producers.clear();
    logger.media.debug('[Producer] 모든 Producer 정리 완료');
  }

  /** 특정 Consumer 반환 (없으면 null) */
  static getConsumer(consumerId: string): Consumer | null {
    return this.consumers.get(consumerId) ?? null;
  }

  /**
   * 특정 Consumer의 MediaStream 반환
   *
   * 반환된 stream을 <video> 또는 <audio> 요소의 srcObject에 연결하면 해당 참여자의 미디어를 재생할 수 있음
   */
  static getStream(consumerId: string): MediaStream | null {
    return this.streams.get(consumerId) ?? null;
  }

  /**
   * Consumer 등록 및 자동 정리 이벤트 바인딩
   *
   * 새 Consumer와 그에 대응하는 MediaStream을 저장함
   * Transport가 닫히거나 트랙이 종료되면 자동으로 정리됨
   */
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
   * 특정 Consumer를 로컬에서 종료 및 제거
   *
   * 상대방이 송출을 중단하거나 퇴장했을 때 호출됨
   * Consumer를 닫고, MediaStream의 트랙들도 명시적으로 중지하여 브라우저 리소스를 해제함
   *
   * @returns Consumer ID (서버 알림용)
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
   * 모든 Consumer를 로컬에서 일괄 종료
   *
   * 방 퇴장 시 모든 수신을 중단
   * 종료된 Consumer ID 목록을 반환하여 서버에 알릴 수 있게 함
   *
   * @returns 종료된 Consumer ID 배열 (서버 closeConsumer 호출용)
   */
  static closeAllConsumersLocally(): string[] {
    const consumerIds = Array.from(this.consumers.keys());
    consumerIds.forEach((id) => this.removeConsumerLocally(id));

    return consumerIds;
  }

  /**
   * 모든 Consumer 정리 (ID 반환 없음)
   *
   * cleanup() 내부에서 사용되는 단순 정리 메서드
   * 서버 통신 없이 로컬만 정리할 때 사용함
   */
  static clearAllConsumers(): void {
    this.consumers.forEach((consumer) => consumer.close());
    this.consumers.clear();
    this.streams.clear();
    logger.media.debug('[Consumer] 모든 Consumer 정리 완료');
  }

  /**
   * 모든 리소스 완전 정리
   *
   * 방 퇴장 시 반드시 호출해야 함
   * Producer → Consumer → Transport → Device 순서로 정리하여
   * 모든 mediasoup 관련 리소스를 해제하고 초기 상태로 되돌림
   */
  static cleanup(): void {
    this.clearAllProducers();
    this.clearAllConsumers();
    this.closeAllTransports();

    this.device = null;
    this.deviceInitPromise = null;
    logger.media.info('[MediasoupClient] 모든 리소스 정리 완료');
  }
}
