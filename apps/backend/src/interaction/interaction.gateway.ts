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
  GetActivePollResponse,
  GetActiveQnaResponse,
  GetQnaResponse,
  ScoreUpdatePayload,
  RankUpdatePayload,
  PresenterScoreInfoPayload,
  RankItem,
  GetActivityScoreRank,
  Participant,
  Room,
  RANK_LIMIT,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import {
  ParticipantManagerService,
  RoomManagerService,
  ActivityScoreManagerService, // ActivityScoreManagerService 임포트
} from '../redis/repository-manager/index.js';
import { ZodValidationPipeSocket } from '../common/pipes/index.js';
import { PrometheusService } from '../prometheus/prometheus.service.js';
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
    private readonly prometheusService: PrometheusService,
    private readonly activityScoreManager: ActivityScoreManagerService, // ActivityScoreManagerService 주입
  ) {}

  /**
   * Socket.IO 해제 이벤트
   * 참고: 연결/해제 메트릭은 RoomGateway에서 중앙 관리
   */
  handleDisconnect(socket: Socket) {
    this.logger.log(`Socket 해제됨 (Interaction): ${socket.id}`);
  }

  // 기존 상호작용 이벤트 핸들러 (점수 업데이트 로직 추가)
  @SubscribeMessage('action_gesture')
  async handleActionGesture(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ActionGestureRequest,
  ): Promise<ActionGestureResponse> {
    const startTime = Date.now();

    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      const { roomId, participantId } = metadata;

      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) {
        return { success: false, error: '참가자를 찾을 수 없습니다.' };
      }

      if (participant.role === 'audience') {
        await this.activityScoreManager.updateScore(roomId, participantId, 'gesture');
      }

      const payload: UpdateGestureStatusPayload = {
        participantId,
        participantName: participant.name,
        gesture: data.gesture,
      };

      this.server.to(roomId).emit('update_gesture_status', payload);

      this.logger.log(`[action_gesture] ${participant.name}님이 ${data.gesture} 제스처`);

      // 제스처 처리 시간 측정 및 기록
      const duration = Date.now() - startTime;
      this.prometheusService.recordGestureEvent(data.gesture, duration);

      return { success: true };
    } catch (error) {
      this.logger.error(`[action_gesture] 실패:`, error);

      // 에러 발생 시에도 시간 측정 (실패한 경우 추적용)
      const duration = Date.now() - startTime;
      this.prometheusService.recordGestureEvent(data.gesture || 'unknown', duration);

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

  @SubscribeMessage('get_active_poll')
  async getActivePoll(@ConnectedSocket() socket: Socket): Promise<GetActivePollResponse> {
    try {
      const { room, participant } = await this.validateAudienceAction(socket.id);
      const { poll, votedOptionId } = await this.interactionService.getActivePoll(
        room.id,
        participant.id,
      );

      return { success: true, poll, votedOptionId };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '진행중 투표 조회에 실패했습니다.';
      this.logger.error(`[get_active_poll] 실패:`, error);
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

  @SubscribeMessage('get_active_qna')
  async getActiveQna(@ConnectedSocket() socket: Socket): Promise<GetActiveQnaResponse> {
    try {
      const { room, participant } = await this.validateAudienceAction(socket.id);
      const { qna, answered } = await this.interactionService.getActiveQna(room.id, participant.id);

      return { success: true, qna, answered };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 조회에 실패했습니다.';
      this.logger.error(`[get_active_qna] 실패:`, error);
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

      await this.activityScoreManager.updateScore(room.id, participant.id, 'qna_answer');

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

  @SubscribeMessage('get_activity_score_rank')
  async getCurrentActivityRank(@ConnectedSocket() socket: Socket): Promise<GetActivityScoreRank> {
    try {
      const { room, participant } = await this.validateMetadata(socket.id);

      // 점수 매니저를 통해 데이터 조회
      const top = await this.activityScoreManager.getTopRankings(room.id, RANK_LIMIT);

      // 역할(Role)에 따른 데이터 분기 처리
      if (participant.role === 'presenter') {
        const lowest = await this.activityScoreManager.getLowest(room.id);

        return { success: true, top, lowest }; // 발표자용 (Top3 + Lowest)
      }

      const myScore = await this.activityScoreManager.getParticipantScore(room.id, participant.id);
      return { success: true, top, score: myScore }; // 청중용 (Top3만)
    } catch (error) {
      this.logger.error(`[get_current_rank] 실패: ${error.message}`);
      return { success: false, error: '랭킹 정보 조회에 실패했습니다.' };
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
      this.logger.error(`[auto_close_poll] 전달 실패: `, error);
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
      this.logger.error(`[auto_close_qna] 전달 실패: `, error);
    }
  }

  // 참여도 점수 관련 이벤트 핸들러 (ActivityScoreManagerService에서 발행한 내부 이벤트를 수신)
  @OnEvent('activity.score.updated')
  handleActivityScoreUpdated(payload: { roomId: string; participantId: string; newScore: number }) {
    const { participantId, newScore } = payload;
    const scorePayload: ScoreUpdatePayload = { score: newScore };
    this.server.to(participantId).emit('score_update', scorePayload);
    this.logger.log(`[Score] ${participantId} 점수 업데이트: ${newScore}`);
  }

  @OnEvent('activity.rank.changed')
  handleActivityRankChanged(payload: { roomId: string; top: RankItem[]; lowest: RankItem | null }) {
    const { roomId, top, lowest } = payload;

    // 모든 청중에게 Top 3 랭킹 전송
    const rankPayload: RankUpdatePayload = { top };
    this.server.to(`${roomId}:audience`).emit('rank_update', rankPayload);
    this.logger.log(`[Rank] ${roomId} 랭킹 업데이트 (Top: ${top.length})`);

    // 발표자에게만 꼴찌 점수 전송
    const presenterPayload: PresenterScoreInfoPayload = { top, lowest };
    this.server.to(`${roomId}:presenter`).emit('presenter_rank_update', presenterPayload);
    this.logger.log(`[Rank] ${roomId} 발표자 꼴찌 점수 업데이트: ${lowest}`);
  }

  private async validateMetadata(
    socketId: string,
  ): Promise<{ room: Room; participant: Participant; metadata: SocketMetadata }> {
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

    return { room, participant, metadata };
  }

  private async validatePresenterAction(socketId: string) {
    const { room, participant, metadata } = await this.validateMetadata(socketId);

    if (participant.role !== 'presenter' || room.presenter !== participant.id) {
      throw new BusinessException('해당 작업을 수행할 권한이 없습니다.');
    }

    if (room.status !== 'active') {
      throw new BusinessException('이미 종료되었거나 진행 중인 강의가 아닙니다.');
    }

    return { participant, room, metadata };
  }

  private async validateAudienceAction(socketId: string) {
    const { room, participant, metadata } = await this.validateMetadata(socketId);

    if (participant.role !== 'audience') {
      throw new BusinessException('해당 작업을 수행할 권한이 없습니다.');
    }

    if (room.status !== 'active') {
      throw new BusinessException('이미 종료되었거나 진행 중인 강의가 아닙니다.');
    }

    return { participant, room, metadata };
  }
}
