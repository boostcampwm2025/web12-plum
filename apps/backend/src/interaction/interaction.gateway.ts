import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import {
  ActionGestureRequest,
  ActionGestureResponse,
  CreatePollRequest,
  CreatePollResponse,
  pollFormSchema,
  EmitPollRequest,
  EmitPollResponse,
  UpdateGestureStatusPayload,
  VoteRequest,
  VoteResponse,
  BreakPollRequest,
  BreakPollResponse,
  UpdatePollStatusSubPayload,
  PollOption,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import {
  ParticipantManagerService,
  RoomManagerService,
} from '../redis/repository-manager/index.js';
import { ZodValidationPipeSocket } from '../common/pipes/index.js';
import { BusinessException, SocketMetadata } from '../common/types/index.js';
import { InteractionService } from './interaction.service.js';

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
        participantName: participant.name,
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

  @SubscribeMessage('get_poll')
  async getPoll(@ConnectedSocket() socket: Socket) {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      const polls = await this.interactionService.getPolls(room.id);

      return { success: true, polls };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 조회에 실패했습니다.';
      this.logger.error(`[get_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('emit_poll')
  async startPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: EmitPollRequest,
  ): Promise<EmitPollResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      const payload = await this.interactionService.startPoll(data.pollId);

      socket.to(room.id).emit('start_poll', payload);

      return { success: true, startedAt: payload.startedAt, endedAt: payload.endedAt };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 시작에 실패했습니다.';
      this.logger.error(`[start_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('vote')
  async vote(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: VoteRequest,
  ): Promise<VoteResponse> {
    try {
      const { room, participant } = await this.validateAudienceAction(socket.id);
      const payload = await this.interactionService.vote(
        data.pollId,
        participant.id,
        participant.name,
        data.optionId,
      );

      this.server.to(`${room.id}:audience`).emit('update_poll', payload);
      this.server.to(`${room.id}:presenter`).emit('update_poll_detail', {
        ...payload,
        voter: {
          participantId: participant.id,
          name: participant.name,
          optionsId: data.optionId,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표에 실패했습니다.';
      this.logger.error(`[vote] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('break_poll')
  async breakPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: BreakPollRequest,
  ): Promise<BreakPollResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);

      const options = await this.interactionService.stopPoll(data.pollId);
      const broadCastPayload: UpdatePollStatusSubPayload = {
        pollId: data.pollId,
        options: options.map((option) => ({
          id: option.id,
          count: option.count,
        })),
      };

      socket.to(room.id).emit('poll_end', broadCastPayload);
      return { success: true, options: options };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 종료에 실패했습니다.';
      this.logger.error(`[break_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @OnEvent('poll.autoClosed')
  async handleAutoClosedEvent(payload: { pollId: string; options: PollOption[] }) {
    try {
      const poll = await this.interactionService.getPoll(payload.pollId);
      this.logger.log(`[auto_close_poll] 전달 ${poll.roomId}: ${poll.id}`);

      this.server.to(`${poll.roomId}:presenter`).emit('poll_end_detail', {
        pollId: poll.id,
        options: payload.options,
      });
      this.server.to(`${poll.roomId}:audience`).emit('poll_end', {
        pollId: poll.id,
        options: payload.options.map((o) => ({ id: o.id, count: o.count })),
      });
    } catch (error) {
      this.logger.error(`[auto_close_poll] 전달 실패: `, error);
    }
  }

  private validateMetadata(socketId: string): SocketMetadata {
    const metadata = this.socketMetadataService.get(socketId);
    if (!metadata) {
      throw new BusinessException('세션이 만료되었거나 유효하지 않은 접근입니다.');
    }
    return metadata;
  }

  private async validatePresenterAction(socketId: string) {
    const metadata = this.validateMetadata(socketId);

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

  private async validateAudienceAction(socketId: string) {
    const metadata = this.validateMetadata(socketId);

    const [participant, room] = await Promise.all([
      this.participantManagerService.findOne(metadata.participantId),
      this.roomManagerService.findOne(metadata.roomId),
    ]);

    if (!participant || !room) {
      throw new BusinessException('방 정보를 찾을 수 없습니다.');
    }

    if (participant.role !== 'audience') {
      throw new BusinessException('해당 작업을 수행할 권한이 없습니다.');
    }

    if (room.status !== 'active') {
      throw new BusinessException('이미 종료되었거나 진행 중인 강의가 아닙니다.');
    }

    return { participant, room, metadata };
  }
}
