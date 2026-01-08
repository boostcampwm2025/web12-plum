import { UseFilters } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { SOCKET_CONFIG } from '../shared/constants/socket.constants.js';
import { WsExceptionFilter } from '../shared/filters/wsException.filter.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class InteractionGateway {}
