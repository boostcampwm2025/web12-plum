import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
import { ConsumerAppData, ProducerAppData } from './mediasoup.type.js';

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
   * 새로운 강의실을 위한 Router 생성
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

      return router;
    } catch (error) {
      this.logger.error(`❌ Router 생성 실패: room ${roomId}:`, error);
      throw error;
    }
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
    }
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
   * @returns Transport 정보 (id, iceParameters, iceCandidates, dtlsParameters)
   * 공식문서: https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
   */
  async createWebRtcTransport(roomId: string) {
    const router = this.routers.get(roomId);
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
      });

      this.logger.log(`✅ Transport 생성 완료 (id: ${transport.id}, room: ${roomId})`);

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
    if (transport) transport.close();
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
    producer.observer.on('close', () => {
      this.producers.delete(producer.id);
      this.logger.log(`Producer 닫힘 (id: ${producer.id})`);
    });

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
    if (!producer) throw new Error(`${producerId} Producer를 찾을 수 없습니다.`);

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
    consumer.observer.on('close', () => {
      this.consumers.delete(consumer.id);
      this.logger.log(`Consumer 닫힘 (id: ${consumer.id})`);
    });

    return consumer;
  }

  getConsumer(consumerId: string): Consumer<ConsumerAppData> | undefined {
    return this.consumers.get(consumerId);
  }

  async resumeConsumer(consumerId: string) {
    const consumer = this.getConsumer(consumerId);
    if (!consumer) throw new Error(`${consumerId} Consumer를 찾을 수 없습니다.`);
    await consumer.resume();
  }

  closeConsumer(consumerId: string) {
    const consumer = this.getConsumer(consumerId);
    if (!consumer) throw new Error(`${consumerId} Consumer를 찾을 수 없습니다.`);
    consumer.close();
  }

  cleanupParticipantFromMaps(producers: string[] = [], consumers: string[] = []) {
    producers.forEach((producerId) => {
      try {
        if (this.producers.has(producerId)) {
          this.closeProducer(producerId);
        }
      } catch (error) {
        this.logger.warn(`Producer ${producerId} 정리 중 오류: ${error.message}`);
      }
    });

    consumers.forEach((consumerId) => {
      try {
        if (this.consumers.has(consumerId)) {
          this.closeConsumer(consumerId);
        }
      } catch (error) {
        this.logger.warn(`Consumer ${consumerId} 정리 중 오류: ${error.message}`);
      }
    });
  }
}
