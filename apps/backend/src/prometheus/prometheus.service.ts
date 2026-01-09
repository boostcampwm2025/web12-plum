import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, Histogram, Counter, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  public readonly registry: Registry;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;

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
  }

  onModuleInit() {
    // 프로세스 메트릭 자동 수집 (CPU, 메모리, 이벤트 루프 등)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
