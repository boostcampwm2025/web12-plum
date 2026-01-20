import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ActionGestureRequest,
  ActionGestureResponse,
  CreatePollRequest,
  CreatePollResponse,
  pollFormSchema,
  UpdateGestureStatusPayload,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import {
  ParticipantManagerService,
  RoomManagerService,
} from '../redis/repository-manager/index.js';
import { ZodValidationPipeSocket } from '../common/pipes/index.js';
import { InteractionService } from './interaction.service.js';
import { BusinessException } from '../common/types';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class InteractionGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(InteractionGateway.name);

  constructor(
    private readonly socketMetadataService: SocketMetadataService,
    private readonly interactionService: InteractionService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly roomManagerService: RoomManagerService,
  ) {}

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

  @SubscribeMessage('create_poll')
  async creatPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipeSocket(pollFormSchema)) data: CreatePollRequest,
  ): Promise<CreatePollResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      await this.interactionService.createPoll(room.id, data);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 생성에 실패했습니다.';
      this.logger.error(`[create_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  private async validatePresenterAction(socketId: string) {
    const metadata = this.socketMetadataService.get(socketId);
    if (!metadata) {
      throw new BusinessException('세션이 만료되었거나 유효하지 않은 접근입니다.');
    }

    const [participant, room] = await Promise.all([
      this.participantManagerService.findOne(metadata.participantId),
      this.roomManagerService.findOne(metadata.roomId),
    ]);

    if (!participant || !room) {
      throw new BusinessException('방 정보를 찾을 수 없습니다.');
    }

    if (participant.role !== 'presenter' || room.presenter !== participant.id) {
      throw new BusinessException('해당 작업을 수행할 권한이 없습니다.');
    }

    if (room.status !== 'active') {
      throw new BusinessException('이미 종료되었거나 진행 중인 강의가 아닙니다.');
    }

    return { participant, room, metadata };
  }
}
