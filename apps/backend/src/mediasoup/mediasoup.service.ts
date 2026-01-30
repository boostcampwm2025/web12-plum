import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as mediasoup from 'mediasoup';
import {
  Worker,
  Router,
  WebRtcTransport,
  DtlsParameters,
  Producer,
  Consumer,
  RtpParameters,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';
import { MediaType } from '@plum/shared-interfaces';
import { mediasoupConfig } from './mediasoup.config.js';
import { ConsumerAppData, ProducerAppData, RoomType } from './mediasoup.type.js';
import { PrometheusService } from '../prometheus/prometheus.service.js';
import { MultiRouterManagerService } from './multi-router-manager.service.js';

/**
 * Mediasoup Worker 및 Router 관리 서비스
 * 공식문서 : https://mediasoup.org/documentation/v3/mediasoup/api/
 *
 * 앱 시작 시 =>  CPU 코어 수만큼 Mediasoup Worker 생성
 * 강의실 생성 시 =>  라운드 로빈으로 Worker 선택 후 Router 생성
 * Worker 죽으면 => 프로세스 종료 (PM2/Docker가 재시작)
 *
 */
@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);

  private workers: Worker[] = []; // CPU 코어 수만큼 생성되는 Worker 배열
  private routers: Map<string, Router> = new Map(); // 강의실별 Router 저장 (roomId -> Router)
  private transports: Map<string, WebRtcTransport> = new Map(); // Transport 저장 (transportId -> Transport)
  private producers: Map<string, Producer<ProducerAppData>> = new Map();
  private consumers: Map<string, Consumer<ConsumerAppData>> = new Map();
  private nextWorkerIdx = 0; // Round-robin Worker 선택 인덱스

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly multiRouterManager: MultiRouterManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 앱 시작 시 Mediasoup Worker 생성
   */
  async onModuleInit() {
    this.logger.log(`${mediasoupConfig.numWorkers} mediasoup workers 생성 중...`);

    for (let i = 0; i < mediasoupConfig.numWorkers; i++) {
      try {
        const worker = await mediasoup.createWorker({
          rtcMinPort: mediasoupConfig.worker.rtcMinPort,
          rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
          logLevel: mediasoupConfig.worker.logLevel,
          logTags: mediasoupConfig.worker.logTags,
        });

        // Worker 사망 시 프로세스 종료 (PM2/Docker가 재시작)
        worker.on('died', () => {
          this.logger.error(
            `❌ Mediasoup Worker (PID: ${worker.pid})가 죽었습니다. 프로세스를 종료합니다.`,
          );
          process.exit(1);
        });

        this.workers.push(worker);
        this.logger.log(`✅ Mediasoup Worker #${i} 생성 완료 (PID: ${worker.pid})`);
      } catch (error) {
        this.logger.error(`❌ Mediasoup Worker #${i} 생성 실패:`, error);
        throw error;
      }
    }

    this.logger.log(`🎉 Mediasoup이 ${this.workers.length}개의 Worker로 초기화되었습니다.`);

    // Prometheus 메트릭 업데이트
    this.prometheusService.setMediasoupWorkers(this.workers.length);

    // Worker CPU 모니터링 시작 (5초마다)
    this.startWorkerMonitoring();
  }

  /**
   * Worker CPU 사용률 모니터링 시작
   * 5초마다 각 Worker의 리소스 사용률을 수집해서 Prometheus에 전송
   */
  private startWorkerMonitoring() {
    setInterval(async () => {
      for (let i = 0; i < this.workers.length; i++) {
        try {
          const worker = this.workers[i];
          const usage = await worker.getResourceUsage();

          // CPU 사용률 계산 (user time + system time)
          //  단위: %
          // getResourceUsage()는 microseconds를 반환하므로 계산 필요
          // 간단히 user time만 사용 (초당 증가량 기준)
          const cpuPercent = usage.ru_utime / 10000; // 대략적인 변환

          this.prometheusService.setWorkerCpu(i, cpuPercent);
        } catch (error) {
          this.logger.warn(`Worker #${i} 리소스 사용률 수집 실패:`, error);
        }
      }
    }, 5000);
  }

  /**
   * 앱 종료 시 모든 Worker 닫기
   */
  async onModuleDestroy() {
    this.logger.log('🛑 모든 Mediasoup Workers 닫는 중...');
    for (const worker of this.workers) {
      worker.close();
    }
  }

  /**
   * 새로운 강의실을 위한 Router 생성 (Legacy - Single Router)
   * @param roomId 강의실 고유 ID
   * @returns Router 인스턴스
   */
  async createRouter(roomId: string): Promise<Router> {
    try {
      // Round-robin으로 Worker 선택
      const worker = this.getNextWorker();

      // Router 생성 (코덱 설정 적용)
      const router = await worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs,
      });

      // Map에 저장
      this.routers.set(roomId, router);

      this.logger.log(`✅ Router이 ${roomId} 강의실에 생성되었습니다. (Worker PID: ${worker.pid})`);

      // Prometheus 메트릭 업데이트
      this.prometheusService.setMediasoupRouters(this.routers.size);

      return router;
    } catch (error) {
      this.logger.error(`❌ Router 생성 실패: room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Multi-Router 아키텍처로 강의실 Router 생성
   * Room Type에 따라 Single/Multi-Router 전략 자동 선택
   * TODO: 지금은 소회의실이 없지만 분산 아키텍처 차이로 우선 type별 분기 유지
   *
   * @param roomId 강의실 고유 ID
   * @param roomType Room 타입 (SMALL_MEETING or LECTURE)
   * @returns Router 배열 (첫 번째가 Primary Router)
   */
  async createRoutersWithStrategy(roomId: string, roomType: RoomType): Promise<Router[]> {
    try {
      const routers = await this.multiRouterManager.createRoutersForRoom(
        roomId,
        roomType,
        this.workers,
      );

      // 첫 번째 Router를 legacy Map에도 저장 (하위 호환성)
      if (routers.length > 0) {
        this.routers.set(roomId, routers[0]);
      }

      // Prometheus 메트릭 업데이트 - 실제 전체 Router 수 반영
      this.prometheusService.setMediasoupRouters(this.getTotalRouterCount());

      return routers;
    } catch (error) {
      this.logger.error(`❌ Multi-Router 생성 실패: room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * 참가자에게 Router 할당 (Multi-Router 전략)
   */
  assignRouterForParticipant(roomId: string, participantId: string): Router {
    return this.multiRouterManager.assignRouterForParticipant(roomId, participantId);
  }

  /**
   * 참가자의 Router 조회
   */
  getParticipantRouter(roomId: string, participantId: string): Router {
    return this.multiRouterManager.getParticipantRouter(roomId, participantId);
  }

  /**
   * 참가자의 Router 인덱스 조회
   */
  getParticipantRouterIndex(roomId: string, participantId: string): number {
    return this.multiRouterManager.getParticipantRouterIndex(roomId, participantId);
  }

  /**
   * 강의실의 Router 조회
   * @param roomId 강의실 고유 ID
   * @returns Router 인스턴스 (없으면 undefined)
   */
  getRouter(roomId: string): Router | undefined {
    return this.routers.get(roomId);
  }

  /**
   * 강의실의 Router 닫기 (강의 종료 시)
   * @param roomId 강의실 고유 ID
   */
  async closeRouter(roomId: string): Promise<void> {
    const router = this.routers.get(roomId);
    if (router) {
      router.close();
      this.routers.delete(roomId);
      this.logger.log(`🗑️  Router이 ${roomId} 강의실에서 닫혔습니다.`);

      // Prometheus 메트릭 업데이트
      this.prometheusService.setMediasoupRouters(this.routers.size);
    }
  }

  /**
   * Multi-Router Room 정리 (강의 종료 시)
   * 모든 Router와 PipeProducer 정리
   */
  async closeRoutersWithStrategy(roomId: string): Promise<void> {
    await this.multiRouterManager.cleanupRoom(roomId);
    this.routers.delete(roomId);

    // Prometheus 메트릭 업데이트 - 실제 전체 Router 수 반영
    this.prometheusService.setMediasoupRouters(this.getTotalRouterCount());
  }

  /**
   * Producer를 모든 Router로 즉시 파이프 (Eager Loading)
   *
   * 사용 대상:
   * - 발표자의 모든 스트림 (video, audio, screen)
   * - 청중의 마이크 (audio) - 마이크 켜면 전원 청취
   */
  async pipeProducerToAllRouters(
    roomId: string,
    producer: Producer<ProducerAppData>,
    sourceRouterIndex: number,
  ): Promise<void> {
    await this.multiRouterManager.pipeProducerToAllRouters(roomId, producer, sourceRouterIndex);
  }

  /**
   * Producer를 특정 Router로 On-Demand 파이프 (Lazy Loading)
   *
   * 사용 대상:
   * - 청중의 카메라 (video) - 최대 5명만 선택적 시청
   */
  async pipeProducerOnDemand(
    roomId: string,
    producer: Producer<ProducerAppData>,
    sourceRouterIndex: number,
    targetRouterIndex: number,
  ): Promise<Producer<ProducerAppData>> {
    return this.multiRouterManager.pipeProducerOnDemand(
      roomId,
      producer,
      sourceRouterIndex,
      targetRouterIndex,
    );
  }

  /**
   * Producer 종료 시 PipeProducer 능동적 정리
   */
  async cleanupPipeProducers(roomId: string, producerId: string): Promise<void> {
    await this.multiRouterManager.cleanupPipeProducers(roomId, producerId);
  }

  /**
   * 참가자 퇴장 처리
   */
  removeParticipantFromRouter(roomId: string, participantId: string): void {
    this.multiRouterManager.removeParticipant(roomId, participantId);
  }

  /**
   * Multi-Router Room 정보 조회
   */
  getMultiRouterRoomInfo(roomId: string) {
    return this.multiRouterManager.getRoomInfo(roomId);
  }

  /**
   * 디버깅용: PipeProducer 상태 조회
   */
  getPipeProducerStatus(roomId: string) {
    return this.multiRouterManager.getPipeProducerStatus(roomId);
  }

  /**
   * Router의 RTP Capabilities 반환
   * 클라이언트가 Device.load()에서 사용
   * @param roomId 강의실 고유 ID
   * @returns RTP Capabilities 객체
   */
  getRouterRtpCapabilities(roomId: string) {
    const router = this.routers.get(roomId);
    if (!router) {
      throw new Error(`${roomId}인 Router를 찾을 수 없습니다.`);
    }
    return router.rtpCapabilities;
  }

  /**
   * Round-robin으로 다음 Worker 선택
   * @returns Worker 인스턴스
   */
  private getNextWorker(): Worker {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  /**
   * 전체 Router 수 계산 (Multi-Router 포함)
   * Prometheus 메트릭용
   */
  private getTotalRouterCount(): number {
    let totalCount = 0;

    // MultiRouterManager에서 관리하는 모든 Room의 Router 수 합산
    for (const roomId of this.routers.keys()) {
      const roomRouters = this.multiRouterManager.getRoomRouters(roomId);
      if (roomRouters) {
        totalCount += roomRouters.length;
      } else {
        // 단일 router
        totalCount += 1;
      }
    }

    return totalCount;
  }

  /**
   * Worker 상태 조회 (헬스체크용)
   * @returns Worker 상태 배열
   */
  getWorkersStatus() {
    return this.workers.map((worker, index) => ({
      index,
      pid: worker.pid,
      closed: worker.closed,
    }));
  }

  // Transport
  /**
   * WebRTC Transport 생성
   * 클라이언트와 서버 간 미디어 송수신 통로 생성
   *
   * @param roomId 강의실 고유 ID
   * @param participantId 참가자 ID (Multi-Router)
   * @returns Transport 정보 (id, iceParameters, iceCandidates, dtlsParameters)
   * 공식문서: https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
   */
  async createWebRtcTransport(roomId: string, participantId?: string) {
    // Multi-Router 전략: 참가자에게 할당된 Router 사용
    // Single Router 전략: 기존 방식 (roomId로 Router 조회)
    let router: Router;

    if (participantId) {
      // 참가자에게 할당된 Router 인덱스 조회
      const routerIndex = this.multiRouterManager.getParticipantRouterIndex(roomId, participantId);
      if (routerIndex !== undefined) {
        const routers = this.multiRouterManager.getRoomRouters(roomId);
        if (routers && routers[routerIndex]) {
          router = routers[routerIndex];
          this.logger.log(
            `🔀 Transport 생성: Router #${routerIndex} 사용 (participant: ${participantId})`,
          );
        } else {
          // fallback: 기존 방식
          router = this.routers.get(roomId)!;
        }
      } else {
        // fallback: 기존 방식
        router = this.routers.get(roomId)!;
      }
    } else {
      // participantId가 없으면 기존 방식 (Single Router)
      router = this.routers.get(roomId)!;
    }

    if (!router) {
      throw new Error(`${roomId} 강의실의 Router를 찾을 수 없습니다.`);
    }

    try {
      // Router에서 WebRtcTransport 생성
      const transport = await router.createWebRtcTransport({
        listenIps: mediasoupConfig.webRtcTransport.listenIps,
        enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
        enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
        preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
        initialAvailableOutgoingBitrate:
          mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
      });

      // Map에 저장
      this.transports.set(transport.id, transport);
      transport.observer.on('close', () => {
        this.transports.delete(transport.id);
        this.logger.log(`Transport 닫힘 (id: ${transport.id})`);

        // Prometheus 메트릭 업데이트
        this.prometheusService.setMediasoupTransports(this.transports.size);
      });

      this.logger.log(`✅ Transport 생성 완료 (id: ${transport.id}, room: ${roomId})`);

      // Prometheus 메트릭 업데이트
      this.prometheusService.setMediasoupTransports(this.transports.size);

      // 클라이언트에게 필요한 정보 반환
      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(`❌ Transport 생성 실패 (room: ${roomId}):`, error);
      throw error;
    }
  }

  /**
   * Transport 연결 (DTLS 핸드쉐이크)
   * 클라이언트의 DTLS 파라미터로 Transport 연결 완료
   *
   * @param transportId Transport 고유 ID
   * @param dtlsParameters 클라이언트의 DTLS 파라미터
   */
  async connectTransport(transportId: string, dtlsParameters: DtlsParameters) {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`${transportId} Transport를 찾을 수 없습니다.`);
    }

    try {
      await transport.connect({ dtlsParameters });
      this.logger.log(`✅ Transport 연결 완료 (id: ${transportId})`);
    } catch (error) {
      this.logger.error(`❌ Transport 연결 실패 (id: ${transportId}):`, error);
      throw error;
    }
  }

  /**
   * Transport 조회
   * @param transportId Transport 고유 ID
   * @returns Transport 인스턴스 (없으면 undefined)
   */
  getTransport(transportId: string): WebRtcTransport | undefined {
    return this.transports.get(transportId);
  }

  /**
   * Transport 닫기
   * 참가자 퇴장 시 Transport 리소스 정리
   *
   * @param transportId Transport 고유 ID
   */
  closeTransport(transportId: string) {
    const transport = this.transports.get(transportId);
    if (!transport || transport.closed) {
      return;
    }
    transport.close();
  }

  async createProducer(
    transportId: string,
    kind: 'audio' | 'video',
    participantId: string,
    source: MediaType,
    rtpParameters: RtpParameters,
  ): Promise<Producer<ProducerAppData>> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`${transportId} Transport를 찾을 수 없습니다.`);

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: {
        ownerId: participantId,
        source,
      },
    });
    this.producers.set(producer.id, producer);

    // Producer 종류 결정 (source가 'screen'이면 'screen', 아니면 kind 사용)
    const producerKind: 'video' | 'audio' | 'screen' =
      source === 'screen' ? 'screen' : (kind as 'video' | 'audio');

    producer.observer.on('close', () => {
      this.producers.delete(producer.id);
      this.logger.log(`Producer 닫힘 (id: ${producer.id})`);

      // Prometheus 메트릭 업데이트
      this.prometheusService.setMediasoupProducers(this.producers.size);
      this.prometheusService.decrementProducerByKind(producerKind);
    });

    // Prometheus 메트릭 업데이트
    this.prometheusService.setMediasoupProducers(this.producers.size);
    this.prometheusService.incrementProducerByKind(producerKind);

    return producer;
  }

  getProducer(producerId: string): Producer<ProducerAppData> | undefined {
    return this.producers.get(producerId);
  }

  async pauseProducer(producerId: string) {
    const producer = this.getProducer(producerId);
    if (!producer) throw new Error(`${producerId} Producer를 찾을 수 없습니다.`);
    await producer.pause();
  }

  async resumeProducer(producerId: string) {
    const producer = this.getProducer(producerId);
    if (!producer) throw new Error(`${producerId} Producer를 찾을 수 없습니다.`);
    await producer.resume();
  }

  closeProducer(producerId: string) {
    const producer = this.getProducer(producerId);
    if (!producer || producer.closed) {
      return;
    }
    producer.close();
  }

  async createConsumer(
    transportId: string,
    producerId: string,
    participantId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<Consumer<ConsumerAppData>> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`${transportId} Transport를 찾을 수 없습니다.`);

    const producer = this.getProducer(producerId);
    if (!producer) throw new Error(`${producerId} Producer를 찾을 수 없습니다.`);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
      appData: {
        ownerId: participantId,
        receiverId: producer.appData.ownerId,
      },
    });
    this.consumers.set(consumer.id, consumer);

    // Consumer 종류 결정 (producer의 appData.source 기반)
    const consumerKind: 'video' | 'audio' | 'screen' =
      producer.appData.source === 'screen' ? 'screen' : (consumer.kind as 'video' | 'audio');

    consumer.observer.on('close', () => {
      this.consumers.delete(consumer.id);
      this.logger.log(`Consumer 닫힘 (id: ${consumer.id})`);

      // Prometheus 메트릭 업데이트
      this.prometheusService.setMediasoupConsumers(this.consumers.size);
      this.prometheusService.decrementConsumerByKind(consumerKind);
    });
    consumer.on('producerclose', () => {
      if (!consumer.closed) consumer.close();

      this.eventEmitter.emit('consumer.closed', {
        consumerId: consumer.id,
        participantId: participantId,
        producerId: producerId,
      });
    });

    // Prometheus 메트릭 업데이트
    this.prometheusService.setMediasoupConsumers(this.consumers.size);
    this.prometheusService.incrementConsumerByKind(consumerKind);

    return consumer;
  }

  getConsumer(consumerId: string): Consumer<ConsumerAppData> | undefined {
    return this.consumers.get(consumerId);
  }

  async resumeConsumer(consumerId: string) {
    const consumer = this.getConsumer(consumerId);
    if (!consumer) {
      throw new Error(`${consumerId} Consumer를 찾을 수 없습니다.`);
    }

    const producer = this.getProducer(consumer.producerId);
    if (producer?.paused) {
      throw new Error(
        `Producer ${producer.id}가 일시정지 상태이므로 Consumer를 재개할 수 없습니다.`,
      );
    }

    await consumer.resume();
  }

  closeConsumer(consumerId: string) {
    const consumer = this.getConsumer(consumerId);
    if (!consumer || consumer.closed) {
      return;
    }
    consumer.close();
  }

  cleanupParticipantFromMaps(producers: string[] = [], consumers: string[] = []) {
    producers.forEach((producerId) => {
      try {
        this.closeProducer(producerId);
      } catch (error) {
        this.logger.warn(`Producer ${producerId} 정리 중 오류: ${error.message}`);
      }
    });

    consumers.forEach((consumerId) => {
      try {
        this.closeConsumer(consumerId);
      } catch (error) {
        this.logger.warn(`Consumer ${consumerId} 정리 중 오류: ${error.message}`);
      }
    });
  }
}
