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
}
