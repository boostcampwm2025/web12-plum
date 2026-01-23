import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, Histogram, Counter, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  public readonly registry: Registry;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;

  // Socket.IO 연결 추적
  private socketIOConnectionsActive: Gauge<string>;

  // Mediasoup 객체 추적
  private mediasoupWorkersActive: Gauge<string>;
  private mediasoupRoutersActive: Gauge<string>;
  private mediasoupTransportsActive: Gauge<string>;
  private mediasoupProducersActive: Gauge<string>;
  private mediasoupConsumersActive: Gauge<string>;

  // Worker별 CPU 사용률 라벨- worker_id
  private mediasoupWorkerCpu: Gauge<'worker_id'>;

  // Producer 종류별 카운트 - kind
  private mediasoupProducersByKind: Gauge<'kind'>;

  // Consumer 종류별 카운트  - kind
  private mediasoupConsumersByKind: Gauge<'kind'>;

  // Transport 상태별 카운트  - state
  private mediasoupTransportsByState: Gauge<'state'>;

  // 제스처 이벤트 카운터 - gesture_type
  private gestureEventsTotal: Counter<'gesture_type'>;

  // 제스처 처리 시간 히스토그램 - gesture_type
  private gestureProcessingDuration: Histogram<'gesture_type'>;

  constructor() {
    this.registry = new Registry();

    // HTTP 요청 시간 (히스토그램)
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    // HTTP 요청 횟수 (카운터)
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Socket.IO 연결 수 (게이지)
    this.socketIOConnectionsActive = new Gauge({
      name: 'socketio_connections_active',
      help: 'Number of active Socket.IO connections',
      registers: [this.registry],
    });

    // Mediasoup Workers 수 (게이지)
    this.mediasoupWorkersActive = new Gauge({
      name: 'mediasoup_workers_active',
      help: 'Number of active Mediasoup workers',
      registers: [this.registry],
    });

    // Mediasoup Routers 수 (게이지)
    this.mediasoupRoutersActive = new Gauge({
      name: 'mediasoup_routers_active',
      help: 'Number of active Mediasoup routers',
      registers: [this.registry],
    });

    // Mediasoup Transports 수 (게이지)
    this.mediasoupTransportsActive = new Gauge({
      name: 'mediasoup_transports_active',
      help: 'Number of active Mediasoup transports',
      registers: [this.registry],
    });

    // Mediasoup Producers 수 (게이지)
    this.mediasoupProducersActive = new Gauge({
      name: 'mediasoup_producers_active',
      help: 'Number of active Mediasoup producers',
      registers: [this.registry],
    });

    // Mediasoup Consumers 수 (게이지)
    this.mediasoupConsumersActive = new Gauge({
      name: 'mediasoup_consumers_active',
      help: 'Number of active Mediasoup consumers',
      registers: [this.registry],
    });

    // Worker별 CPU 사용률 (게이지, 라벨: worker_id)
    this.mediasoupWorkerCpu = new Gauge({
      name: 'mediasoup_worker_cpu',
      help: 'CPU usage percentage of each Mediasoup worker',
      labelNames: ['worker_id'],
      registers: [this.registry],
    });

    // Producer 종류별 카운트 (게이지, 라벨: kind)
    this.mediasoupProducersByKind = new Gauge({
      name: 'mediasoup_producers_by_kind',
      help: 'Number of active Mediasoup producers by kind (video/audio/screen)',
      labelNames: ['kind'],
      registers: [this.registry],
    });

    // Consumer 종류별 카운트 (게이지, 라벨: kind)
    this.mediasoupConsumersByKind = new Gauge({
      name: 'mediasoup_consumers_by_kind',
      help: 'Number of active Mediasoup consumers by kind (video/audio/screen)',
      labelNames: ['kind'],
      registers: [this.registry],
    });

    // Transport 상태별 카운트 (게이지, 라벨: state)
    this.mediasoupTransportsByState = new Gauge({
      name: 'mediasoup_transports_by_state',
      help: 'Number of Mediasoup transports by state (connected/failed/closed)',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // 제스처 이벤트 카운터 (카운터, 라벨: gesture_type)
    this.gestureEventsTotal = new Counter({
      name: 'gesture_events_total',
      help: 'Total number of gesture events',
      labelNames: ['gesture_type'],
      registers: [this.registry],
    });

    // 제스처 처리 시간 히스토그램 (히스토그램, 라벨: gesture_type)
    this.gestureProcessingDuration = new Histogram({
      name: 'gesture_processing_duration_seconds',
      help: 'Duration of gesture processing in seconds',
      labelNames: ['gesture_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // 프로세스 메트릭 자동 수집 (CPU, 메모리, 이벤트 루프 등)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
    });

    // Mediasoup 메트릭 초기값 설정 (메트릭이 항상 노출되도록)
    this.socketIOConnectionsActive.set(0);
    this.mediasoupWorkersActive.set(0);
    this.mediasoupRoutersActive.set(0);
    this.mediasoupTransportsActive.set(0);
    this.mediasoupProducersActive.set(0);
    this.mediasoupConsumersActive.set(0);

    // 새 메트릭 초기값 설정
    ['video', 'audio', 'screen'].forEach((kind) => {
      this.mediasoupProducersByKind.set({ kind }, 0);
      this.mediasoupConsumersByKind.set({ kind }, 0);
    });

    ['connected', 'failed', 'closed'].forEach((state) => {
      this.mediasoupTransportsByState.set({ state }, 0);
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Socket.IO 연결 메트릭
  incrementSocketIOConnections(): void {
    this.socketIOConnectionsActive.inc();
  }

  decrementSocketIOConnections(): void {
    this.socketIOConnectionsActive.dec();
  }

  // Mediasoup 메트릭
  // 목적: Mediasoup 객체 수를 외부에서 설정
  setMediasoupWorkers(count: number): void {
    this.mediasoupWorkersActive.set(count);
  }

  // Mediasoup Routers 수 설정
  setMediasoupRouters(count: number): void {
    this.mediasoupRoutersActive.set(count);
  }

  // Mediasoup Transports 수 설정
  setMediasoupTransports(count: number): void {
    this.mediasoupTransportsActive.set(count);
  }

  // Mediasoup Producers 수 설정
  setMediasoupProducers(count: number): void {
    this.mediasoupProducersActive.set(count);
  }

  // Mediasoup Consumers 수 설정
  setMediasoupConsumers(count: number): void {
    this.mediasoupConsumersActive.set(count);
  }

  // Worker CPU 업데이트
  setWorkerCpu(workerId: number, cpuPercent: number): void {
    this.mediasoupWorkerCpu.set({ worker_id: workerId.toString() }, cpuPercent);
  }

  // Producer 종류별 증가
  incrementProducerByKind(kind: 'video' | 'audio' | 'screen'): void {
    this.mediasoupProducersByKind.inc({ kind });
  }

  // Producer 종류별 감소
  decrementProducerByKind(kind: 'video' | 'audio' | 'screen'): void {
    this.mediasoupProducersByKind.dec({ kind });
  }

  // Consumer 종류별 증가
  incrementConsumerByKind(kind: 'video' | 'audio' | 'screen'): void {
    this.mediasoupConsumersByKind.inc({ kind });
  }

  // Consumer 종류별 감소
  decrementConsumerByKind(kind: 'video' | 'audio' | 'screen'): void {
    this.mediasoupConsumersByKind.dec({ kind });
  }

  // Transport 상태 업데이트
  incrementTransportByState(state: 'connected' | 'failed' | 'closed'): void {
    this.mediasoupTransportsByState.inc({ state });
  }

  decrementTransportByState(state: 'connected' | 'failed' | 'closed'): void {
    this.mediasoupTransportsByState.dec({ state });
  }

  // 제스처 이벤트 기록
  recordGestureEvent(gestureType: string, durationMs: number): void {
    this.gestureEventsTotal.inc({ gesture_type: gestureType });
    this.gestureProcessingDuration.observe({ gesture_type: gestureType }, durationMs / 1000);
  }
}
