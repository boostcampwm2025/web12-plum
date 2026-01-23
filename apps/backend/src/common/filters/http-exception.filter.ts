import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // 현재 실행 컨텍스트를 HTTP 컨텍스트로 전환
    const ctx = host.switchToHttp();

    // Express Response 객체
    const response = ctx.getResponse();

    // Express Request 객체
    const request = ctx.getRequest();

    // HttpException이면 해당 상태 코드 사용, 아니면 500 에러
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 클라이언트에게 노출할 메시지
    // 500 에러의 경우 고정 메시지 사용
    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    // 클라이언트에게 내려줄 에러 응답 바디
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // 에러 로깅
    if (status >= 500) {
      // 5xx 에러는 error 레벨
      this.logger.error(
        `[Exception] ${request.method} ${request.url} ${status} - ${message}`,
        exception instanceof Error ? exception.stack : '',
        'ExceptionFilter',
      );
    } else if (status >= 400) {
      // 4xx 에러는 warn 레벨
      this.logger.warn(
        `[Exception] ${request.method} ${request.url} ${status} - ${message}`,
        'ExceptionFilter',
      );
    }

    response.status(status).json(errorResponse);
  }
}
