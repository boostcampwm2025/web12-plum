import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
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
  PollOption,
  CreateQnaResponse,
  CreateQnaRequest,
  qnaFormSchema,
  GetPollResponse,
  EmitQnaRequest,
  EmitQnaResponse,
  AnswerRequest,
  AnswerResponse,
  BreakQnaRequest,
  BreakQnaResponse,
  Answer,
  EndQnaPayload,
  EndQnaDetailPayload,
  GetQnaResponse,
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
export class InteractionGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(InteractionGateway.name);

  constructor(
    private readonly socketMetadataService: SocketMetadataService,
    private readonly interactionService: InteractionService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly roomManagerService: RoomManagerService,
  ) {}

  /**
   * Socket.IO 해제 이벤트
   * 참고: 연결/해제 메트릭은 RoomGateway에서 중앙 관리
   */
  handleDisconnect(socket: Socket) {
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
      const poll = await this.interactionService.createPoll(room.id, data);

      this.logger.log(`[create_poll] ${room.id}에서 새 투표 생성: ${data.title} (${poll.id})`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표 생성에 실패했습니다.';
      this.logger.error(`[create_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('get_poll')
  async getPoll(@ConnectedSocket() socket: Socket): Promise<GetPollResponse> {
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

      this.logger.log(`[start_poll] ${room.id}에서 투표 시작: ${data.pollId}`);

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

  @SubscribeMessage('break_poll')
  async breakPoll(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: BreakPollRequest,
  ): Promise<BreakPollResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);

      const { title, options } = await this.interactionService.stopPoll(data.pollId);
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

  @SubscribeMessage('create_qna')
  async createQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipeSocket(qnaFormSchema)) data: CreateQnaRequest,
  ): Promise<CreateQnaResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      const qna = await this.interactionService.createQna(room.id, data);

      this.logger.log(`[create_poll] ${room.id}에서 새 질문 생성: ${data.title} (${qna.id})`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 생성에 실패했습니다.';
      this.logger.error(`[create_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('get_qna')
  async getQna(@ConnectedSocket() socket: Socket): Promise<GetQnaResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      const qnas = await this.interactionService.getQnas(room.id);

      return { success: true, qnas };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 조회에 실패했습니다.';
      this.logger.error(`[get_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('emit_qna')
  async startQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: EmitQnaRequest,
  ): Promise<EmitQnaResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);
      const payload = await this.interactionService.startQna(data.qnaId);

      socket.to(room.id).emit('start_qna', payload);

      this.logger.log(`[start_qna] ${room.id}에서 질문 시작: ${data.qnaId}`);
      return { success: true, startedAt: payload.startedAt, endedAt: payload.endedAt };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 시작에 실패했습니다.';
      this.logger.error(`[start_qna] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('answer')
  async answer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AnswerRequest,
  ): Promise<AnswerResponse> {
    try {
      const { room, participant } = await this.validateAudienceAction(socket.id);
      const result = await this.interactionService.answer(
        data.qnaId,
        participant.id,
        participant.name,
        data.text,
      );

      this.server.to(`${room.id}:audience`).emit('update_qna', result.audience);
      this.server.to(`${room.id}:presenter`).emit('update_qna_detail', result.presenter);
      this.logger.log(`[answer] ${participant.name}님이 질문 답변 제출: ${data.qnaId}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '투표에 실패했습니다.';
      this.logger.error(`[vote] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('break_qna')
  async breakQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: BreakQnaRequest,
  ): Promise<BreakQnaResponse> {
    try {
      const { room } = await this.validatePresenterAction(socket.id);

      const payload = await this.interactionService.stopQna(data.qnaId);

      socket.to(room.id).emit('qna_end', payload.audience);

      this.logger.log(`[break_qna] ${room.id}에서 질문 수동 종료: ${data.qnaId}`);
      return { success: true, answers: payload.presenter.answers, count: payload.presenter.count };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 종료에 실패했습니다.';
      this.logger.error(`[break_qna] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @OnEvent('poll.autoClosed')
  async handleAutoClosedPollEvent(payload: { pollId: string; results: PollOption[] }) {
    try {
      const poll = await this.interactionService.getPoll(payload.pollId);

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
      this.logger.error(`[auto_close_qna] 전달 실패: `, error);
    }
  }

  @OnEvent('qna.autoClosed')
  async handleAutoClosedQnaEvent(payload: { qnaId: string; answers: Answer[] }) {
    try {
      const qna = await this.interactionService.getQna(payload.qnaId);

      const audiencePayload: EndQnaPayload = {
        qnaId: qna.id,
        title: qna.title,
        count: payload.answers.length,
        ...(qna.isPublic && { text: payload.answers.map((a) => a.text) }),
      };
      const presenterPayload: EndQnaDetailPayload = {
        qnaId: qna.id,
        title: qna.title,
        count: payload.answers.length,
        answers: payload.answers,
      };
      this.server.to(`${qna.roomId}:presenter`).emit('qna_end_detail', presenterPayload);
      this.server.to(`${qna.roomId}:audience`).emit('qna_end', audiencePayload);
      this.logger.log(`[auto_close_qna] 전달 ${qna.roomId}: ${qna.id}`);
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
