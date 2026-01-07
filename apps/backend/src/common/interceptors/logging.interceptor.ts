import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // 요청 시작 로그
    this.logger.log(`[Request] ${method} ${url} - User-Agent: ${userAgent} - IP: ${ip}`, 'HTTP');

    return next.handle().pipe(
      tap(() => {
        // 성공 응답 로그
        const { statusCode } = response;
        const responseTime = Date.now() - startTime;

        this.logger.log(`[Response] ${method} ${url} ${statusCode} - ${responseTime}ms`, 'HTTP');
      }),
      catchError((error) => {
        // 에러 응답 로그
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error(
          `[Error] ${method} ${url} ${statusCode} - ${responseTime}ms - ${error.message}`,
          error.stack,
          'HTTP',
        );

        throw error;
      }),
    );
  }
}
