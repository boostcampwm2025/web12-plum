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
  Answer,
  AnswerRequest,
  AnswerResponse,
  BreakQnaRequest,
  BreakQnaResponse,
  CreateQnaRequest,
  CreateQnaResponse,
  EmitQnaRequest,
  EmitQnaResponse,
  EndQnaDetailPayload,
  EndQnaPayload,
  GetActiveQnaResponse,
  GetQnaResponse,
  qnaFormSchema,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../../common/filters/index.js';
import { ZodValidationPipeSocket } from '../../common/pipes/index.js';
import { BusinessException } from '../../common/types/index.js';
import { WsAudienceGuard, WsPresenterGuard } from '../../common/guard/ws-action.guard.js';
import { ActivityScoreManagerService } from '../../redis/repository-manager/index.js';
import { QnaService } from '../service/index.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class QnaGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(QnaGateway.name);

  constructor(
    private readonly qnaService: QnaService,
    private readonly activityScoreManager: ActivityScoreManagerService,
  ) {}

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('create_qna')
  async createQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipeSocket(qnaFormSchema)) data: CreateQnaRequest,
  ): Promise<CreateQnaResponse> {
    try {
      const { room } = socket.data;
      const qna = await this.qnaService.createQna(room.id, data);

      this.logger.log(`[create_poll] ${room.id}에서 새 질문 생성: ${data.title} (${qna.id})`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 생성에 실패했습니다.';
      this.logger.error(`[create_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('get_qna')
  async getQna(@ConnectedSocket() socket: Socket): Promise<GetQnaResponse> {
    try {
      const { room } = socket.data;
      const qnas = await this.qnaService.getQnas(room.id);

      return { success: true, qnas };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 조회에 실패했습니다.';
      this.logger.error(`[get_poll] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsAudienceGuard)
  @SubscribeMessage('get_active_qna')
  async getActiveQna(@ConnectedSocket() socket: Socket): Promise<GetActiveQnaResponse> {
    try {
      const { room, participant } = socket.data;
      const { qna, answered } = await this.qnaService.getActiveQna(room.id, participant.id);
      if (qna === null) return { success: false, error: '현재 진행중인 질문이 없습니다' };

      return { success: true, qna, answered };
    } catch (error) {
      const errorMessage =
        error instanceof BusinessException ? error.message : '질문 조회에 실패했습니다.';
      this.logger.error(`[get_active_qna] 실패:`, error);
      return { success: false, error: errorMessage };
    }
  }

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('emit_qna')
  async startQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: EmitQnaRequest,
  ): Promise<EmitQnaResponse> {
    try {
      const { room } = socket.data;
      const payload = await this.qnaService.startQna(data.qnaId);

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

  @UseGuards(WsAudienceGuard)
  @SubscribeMessage('answer')
  async answer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AnswerRequest,
  ): Promise<AnswerResponse> {
    try {
      const { room, participant } = socket.data;
      const result = await this.qnaService.answer(
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

  @UseGuards(WsPresenterGuard)
  @SubscribeMessage('break_qna')
  async breakQna(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: BreakQnaRequest,
  ): Promise<BreakQnaResponse> {
    try {
      const { room } = socket.data;

      const payload = await this.qnaService.stopQna(data.qnaId);

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

  @OnEvent('qna.autoClosed')
  async handleAutoClosedQnaEvent(payload: { qnaId: string; answers: Answer[] }) {
    try {
      const qna = await this.qnaService.getQna(payload.qnaId);

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
}
