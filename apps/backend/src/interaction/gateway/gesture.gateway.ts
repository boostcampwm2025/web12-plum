import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ActionGestureRequest,
  ActionGestureResponse,
  UpdateGestureStatusPayload,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../../common/filters/index.js';
import { WsAuthGuard } from '../../common/guard/ws-action.guard.js';
import { ActivityScoreManagerService } from '../../redis/repository-manager/index.js';
import { PrometheusService } from '../../prometheus/index.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class GestureGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(GestureGateway.name);

  constructor(
    private readonly activityScoreManager: ActivityScoreManagerService,
    private readonly prometheusService: PrometheusService,
  ) {}

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('action_gesture')
  async handleActionGesture(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ActionGestureRequest,
  ): Promise<ActionGestureResponse> {
    const startTime = Date.now();
    const { room, participant } = socket.data;
    const { gesture } = data;

    try {
      if (participant.role === 'audience') {
        await this.activityScoreManager.updateScore(room.id, participant.id, 'gesture');
      }

      const payload: UpdateGestureStatusPayload = {
        participantId: participant.id,
        participantName: participant.name,
        gesture: gesture,
      };

      this.server.to(room.id).emit('update_gesture_status', payload);

      this.logger.log(`[action_gesture] ${participant.name}님이 ${gesture} 제스처`);

      // 제스처 처리 시간 측정 및 기록
      const duration = Date.now() - startTime;
      this.prometheusService.recordGestureEvent(gesture, duration);

      return { success: true };
    } catch (error) {
      this.logger.error(`[action_gesture] 실패:`, error);

      // 에러 발생 시에도 시간 측정 (실패한 경우 추적용)
      const duration = Date.now() - startTime;
      this.prometheusService.recordGestureEvent(gesture || 'unknown', duration);

      return { success: false, error: '제스처 처리에 실패했습니다.' };
    }
  }
}
