import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ActionGestureRequest,
  ActionGestureResponse,
  UpdateGestureStatusPayload,
} from '@plum/shared-interfaces';
import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import { ParticipantManagerService } from '../redis/repository-manager/index.js';
import { PrometheusService } from '../prometheus/prometheus.service.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class InteractionGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(InteractionGateway.name);

  constructor(
    private readonly socketMetadataService: SocketMetadataService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly prometheusService: PrometheusService,
  ) {}

  /**
   * Socket.IO 연결 시 메트릭 증가
   */
  handleConnection(socket: Socket) {
    this.prometheusService.incrementSocketIOConnections();
    this.logger.log(`Socket 연결됨 (Interaction): ${socket.id}`);
  }

  /**
   * Socket.IO 해제 시 메트릭 감소
   */
  handleDisconnect(socket: Socket) {
    this.prometheusService.decrementSocketIOConnections();
    this.logger.log(`Socket 해제됨 (Interaction): ${socket.id}`);
  }

  @SubscribeMessage('action_gesture')
  async handleActionGesture(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ActionGestureRequest,
  ): Promise<ActionGestureResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      const { roomId, participantId } = metadata;

      // 1. 참가자 정보 조회
      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) {
        return { success: false, error: '참가자를 찾을 수 없습니다.' };
      }

      // 2. gestureCount 증가 (참여도 통계용)
      await this.participantManagerService.updatePartial(participantId, {
        gestureCount: participant.gestureCount + 1,
      });

      // 3. 브로드캐스트 (본인 포함 전체에게)
      const payload: UpdateGestureStatusPayload = {
        participantId,
        gesture: data.gesture,
      };

      this.server.to(roomId).emit('update_gesture_status', payload);

      this.logger.log(`[action_gesture] ${participant.name}님이 ${data.gesture} 제스처`);

      return { success: true };
    } catch (error) {
      this.logger.error(`[action_gesture] 실패:`, error);
      return { success: false, error: '제스처 처리에 실패했습니다.' };
    }
  }
}
