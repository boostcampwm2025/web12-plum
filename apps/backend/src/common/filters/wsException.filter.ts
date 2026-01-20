import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = host.switchToWs().getClient<Socket>();
    const args = host.getArgs();
    const event = ctx.getPattern() || 'unknown';

    let errorMessage = 'internal server error';
    if (exception instanceof WsException) {
      const errorData = exception.getError();
      errorMessage =
        typeof errorData === 'string' ? errorData : (errorData as any).message || errorMessage;
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
    };

    this.logger.error(
      `[WsException] Event: ${event} | Message: ${errorMessage}`,
      exception instanceof Error ? exception.stack : '',
      'WsExceptionFilter',
    );

    const lastArg = args[args.length - 1];
    const isAck = typeof lastArg === 'function';

    if (isAck) {
      lastArg(errorResponse);
    } else {
      client.emit('error_occurred', {
        event,
        ...errorResponse,
      });
    }
  }
}
