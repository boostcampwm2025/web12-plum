import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BreakPollRequest,
  BreakPollResponse,
  CreatePollRequest,
  CreatePollResponse,
  EmitPollRequest,
  EmitPollResponse,
  GetActivePollResponse,
  GetPollResponse,
  pollFormSchema,
  PollOption,
  VoteRequest,
  VoteResponse,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../../common/filters/index.js';
import { ZodValidationPipeSocket } from '../../common/pipes/index.js';
import { BusinessException } from '../../common/types/index.js';
import { WsAudienceGuard, WsPresenterGuard } from '../../common/guard/ws-action.guard.js';
import { ActivityScoreManagerService } from '../../redis/repository-manager/index.js';
import { PollService } from '../service/index.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class PollGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(PollGateway.name);

  constructor(
    private readonly pollService: PollService,
    private readonly activityScoreManager: ActivityScoreManagerService,
  ) {}

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('create_poll')
  async creatPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipeSocket(pollFormSchema)) data: CreatePollRequest,
  ): Promise<CreatePollResponse> {
    try {
      const { room } = socket.data;
      const poll = await this.pollService.createPoll(room.id, data);

      this.logger.log(`[create_poll] ${room.id}에서 새 투표 생성: ${data.title} (${poll.id})`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 생성에 실패했습니다.';
      this.logger.error(`[create_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('get_poll')
  async getPoll(@ConnectedSocket() socket: Socket): Promise<GetPollResponse> {
    try {
      const { room } = socket.data;
      const polls = await this.pollService.getPolls(room.id);

      return { success: true, polls };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 조회에 실패했습니다.';
      this.logger.error(`[get_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsAudienceGuard)
  @SubscribeMessage('get_active_poll')
  async getActivePoll(@ConnectedSocket() socket: Socket): Promise<GetActivePollResponse> {
    try {
      const { room, participant } = socket.data;
      const { poll, votedOptionId } = await this.pollService.getActivePoll(room.id, participant.id);
      if (poll === null) return { success: false, error: '현재 진행중인 투표가 없습니다' };

      return { success: true, poll, votedOptionId };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '진행중 투표 조회에 실패했습니다.';
      this.logger.error(`[get_active_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('emit_poll')
  async startPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: EmitPollRequest,
  ): Promise<EmitPollResponse> {
    try {
      const { room } = socket.data;
      const payload = await this.pollService.startPoll(data.pollId);

      socket.to(room.id).emit('start_poll', payload);

      this.logger.log(`[start_poll] ${room.id}에서 투표 시작: ${data.pollId}`);

      return { success: true, startedAt: payload.startedAt, endedAt: payload.endedAt };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 시작에 실패했습니다.';
      this.logger.error(`[start_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsAudienceGuard)
  @SubscribeMessage('vote')
  async vote(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: VoteRequest,
  ): Promise<VoteResponse> {
    try {
      const { room, participant } = socket.data;
      const payload = await this.pollService.vote(
        data.pollId,
        participant.id,
        participant.name,
        data.optionId,
      );

      const activityType = data.isGesture ? 'vote_gesture' : 'vote';
      await this.activityScoreManager.updateScore(room.id, participant.id, activityType);

      this.server.to(`${room.id}:audience`).emit('update_poll', payload);
      this.server.to(`${room.id}:presenter`).emit('update_poll_detail', {
        ...payload,
        voter: {
          participantId: participant.id,
          name: participant.name,
          optionId: data.optionId,
        },
      });

      this.logger.log(
        `[vote] ${participant.name}님이 투표 참여: ${data.pollId} (항목: ${data.optionId})`,
      );

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표에 실패했습니다.';
      this.logger.error(`[vote] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('break_poll')
  async breakPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: BreakPollRequest,
  ): Promise<BreakPollResponse> {
    try {
      const { room } = socket.data;

      const { title, options } = await this.pollService.stopPoll(data.pollId);
      socket.to(room.id).emit('poll_end', {
        pollId: data.pollId,
        title,
        options: options.map((option) => ({
          id: option.id,
          value: option.value,
          count: option.count,
        })),
      });
      this.logger.log(`[break_poll] ${room.id}에서 투표 수동 종료: ${data.pollId}`);
      return { success: true, options };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 종료에 실패했습니다.';
      this.logger.error(`[break_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @OnEvent('poll.autoClosed')
  async handleAutoClosedPollEvent(payload: { pollId: string; results: PollOption[] }) {
    try {
      const poll = await this.pollService.getPoll(payload.pollId);

      this.server.to(`${poll.roomId}:presenter`).emit('poll_end_detail', {
        pollId: poll.id,
        options: payload.results,
      });
      this.server.to(`${poll.roomId}:audience`).emit('poll_end', {
        pollId: poll.id,
        title: poll.title,
        options: payload.results.map((o) => ({ id: o.id, value: o.value, count: o.count })),
      });
      this.logger.log(`[auto_close_poll] 전달 ${poll.roomId}: ${poll.id}`);
    } catch (error) {
      this.logger.error(`[auto_close_poll] 전달 실패: `, error);
    }
  }
}
