import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const event = host.getArgs()[1]?.event || 'unknown';

    let errorResponse: string | object;
    if (exception instanceof WsException) {
      const error = exception.getError();
      errorResponse = typeof error === 'string' ? { message: error } : error;
    } else if (exception instanceof Error) {
      errorResponse = { status: 'error', message: exception.message };
    } else {
      errorResponse = { status: 'error', message: 'internal server error' };
    }

    // TODO: logging error

    client.emit('error_occurred', {
      event,
      timestamp: new Date().toISOString(),
      ...errorResponse,
    });
  }
}
