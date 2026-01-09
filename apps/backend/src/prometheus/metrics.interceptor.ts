import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from './prometheus.service.js';

/**
 *
 * 모든 HTTP 요청을 자동으로 가로채서 Prometheus 메트릭을 수집하는 인터셉터
 *
 * 1. HTTP 요청이 시작되면 타이머 시작
 * 2. 요청 처리 후 응답 시간 측정
 * 3. 요청 정보(method, route, status code)를 라벨로 저장
 * 4. Prometheus 메트릭에 기록 (Duration Histogram, Count Counter)
 *
 * 왜 필요할까?
 * - 모든 엔드포인트에 메트릭 코드를 일일이 추가하지 않아도 됨
 * - 컨트롤러 코드를 수정하지 않고 자동으로 메트릭 수집
 * - 전역 인터셉터로 등록하면 모든 HTTP 요청에 자동 적용
 *
 * 흐름
 * 요청 도착 → Interceptor 실행 → 타이머 시작 → Controller 처리 →
 * Interceptor로 돌아옴 → 시간 측정 → 메트릭 기록 → 응답 반환
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: PrometheusService) {}

  /**
   * HTTP 요청을 가로채는 메인 메서드
   *
   * @param context - NestJS 실행 컨텍스트 (요청/응답 정보 접근)
   * @param next - 다음 핸들러 (실제 Controller 로직)
   * @returns Observable - RxJS 스트림 (비동기 처리)
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 1. 요청 정보 추출
    const request = context.switchToHttp().getRequest();
    const method = request.method; // GET, POST, PUT, DELETE 등
    const route = request.route?.path || request.url; // /health, /metrics 등

    // 2. 타이머 시작 (요청 처리 시작 시간 기록)
    const start = Date.now();

    // 3. 실제 Controller
    return next.handle().pipe(
      tap({
        // 성공 - 정상 응답 시 메트릭 기록
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode; // 200, 201 등
          const duration = (Date.now() - start) / 1000; // 초 단위로 변환

          // HTTP 요청 응답 시간
          // GET /health 200 → 0.05초
          this.prometheusService.httpRequestDuration
            .labels(method, route, statusCode.toString())
            .observe(duration);

          // HTTP 요청 횟수 증가 (카운터)
          // GET /health 200 → +1
          this.prometheusService.httpRequestsTotal
            .labels(method, route, statusCode.toString())
            .inc();
        },

        //실패 - 에러 발생 시에도 메트릭 기록
        error: (error) => {
          const statusCode = error.status || 500; // 404, 500 등
          const duration = (Date.now() - start) / 1000;

          // 에러 케이스도 응답 시간과 횟수 기록
          // GET /invalid-path 404 → 0.01초
          this.prometheusService.httpRequestDuration
            .labels(method, route, statusCode.toString())
            .observe(duration);

          // GET /invalid-path 404 → +1
          this.prometheusService.httpRequestsTotal
            .labels(method, route, statusCode.toString())
            .inc();
        },
      }),
    );
  }
}
