import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const event = host.getArgs()[1]?.event || 'unknown';

    const message = exception instanceof WsException ? exception.message : 'internal server error';

    const errorResponse = {
      event,
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
    }

    this.logger.error(
      `[WsException] ${event} - ${message}`,
      exception instanceof Error ? exception.stack : '',
      `ExceptionFilter`,
    );

    client.emit('error_occurred', errorResponse);
  }
}
