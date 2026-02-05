import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import {
  CreateQnaRequest,
  EndQnaDetailPayload,
  EndQnaPayload,
  Qna,
  QnaPayload,
  UpdateQnaFullPayload,
  UpdateQnaSubPayload,
} from '@plum/shared-interfaces';

import { QnaManagerService } from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';

@Injectable()
export class QnaService {
  constructor(private readonly qnaManagerService: QnaManagerService) {}

  /**
   * 질문 객체 생성 로직
   * @param roomId 속한 강의실 id
   * @param dto 유저가 입력한 질문 Raw 데이터
   * @private
   */
  private prepareQna(roomId: string, dto: CreateQnaRequest): Qna {
    const id = ulid();
    const now = new Date().toISOString();
    return {
      id,
      roomId,
      status: 'pending',
      ...dto,
      answers: [],
      createdAt: now,
      updatedAt: now,
      startedAt: '',
      endedAt: '',
    };
  }

  /**
   * 질문 생성 로직
   * @param roomId 속한 강의실 id
   * @param dto 유저가 입력한 질문 Raw 데이터
   */
  async createQna(roomId: string, dto: CreateQnaRequest): Promise<Qna> {
    const qna = this.prepareQna(roomId, dto);
    await this.qnaManagerService.addQnaToRoom(roomId, [qna]);
    return qna;
  }

  /**
   * 질문 배열 생성 로직
   * @param roomId 속한 강의실 id
   * @param data 유저가 입력한 질문 Raw 데이터들
   */
  async createMultipleQna(roomId: string, data: CreateQnaRequest[]): Promise<Qna[]> {
    if (!data || data.length === 0) return [];

    const qnas = data.map((dto) => this.prepareQna(roomId, dto));
    await this.qnaManagerService.addQnaToRoom(roomId, qnas);
    return qnas;
  }

  /**
   * 질문 조회 로직
   * @param qnaId 조회할 질문 id
   */
  async getQna(qnaId: string): Promise<Qna> {
    const poll = await this.qnaManagerService.findOne(qnaId);
    if (!poll) throw new Error('Could not find qna');

    return poll;
  }

  /**
   * 강의실 질문 조회 로직
   * @param roomId 조회할 강의실 id
   */
  async getQnas(roomId: string): Promise<Qna[]> {
    const qnas = await this.qnaManagerService.getQnasInRoom(roomId);

    const activeQnas = qnas.filter((qna) => qna.status === 'active');
    if (activeQnas.length === 0) return qnas;

    const answersByQnaId = await Promise.all(
      activeQnas.map(async (qna) => ({
        id: qna.id,
        answers: await this.qnaManagerService.getActiveAnswers(qna.id),
      })),
    );
    const answersMap = new Map(answersByQnaId.map((entry) => [entry.id, entry.answers]));

    return qnas.map((qna) => {
      if (qna.status !== 'active') return qna;

      const answers = answersMap.get(qna.id);
      if (!answers) return qna;

      return {
        ...qna,
        answers,
      };
    });
  }

  /**
   * 활성화된 질문 조회 로직
   * @param roomId 조회할 강의실 id
   * @param participantId 조회할 참여자 id
   */
  async getActiveQna(
    roomId: string,
    participantId: string,
  ): Promise<{ qna: QnaPayload | null; answered: boolean }> {
    const qnas = await this.qnaManagerService.getQnasInRoom(roomId);
    const activeQna = qnas.find((qna) => qna.status === 'active');

    if (!activeQna) return { qna: null, answered: false };

    const qnaPayload: QnaPayload = {
      id: activeQna.id,
      title: activeQna.title,
      timeLimit: activeQna.timeLimit,
      startedAt: activeQna.startedAt,
      endedAt: activeQna.endedAt,
    };

    const answered = await this.qnaManagerService.hasAnswered(activeQna.id, participantId);

    return { qna: qnaPayload, answered };
  }

  /**
   * 질문 시작 로직
   * @param qnaId 시작할 질문 id
   */
  async startQna(qnaId: string): Promise<QnaPayload> {
    const qna = await this.qnaManagerService.findOne(qnaId);
    if (!qna) throw new BusinessException('존재하지 않는 질문입니다.');
    if (qna.status !== 'pending') throw new BusinessException('이미 시작되거나 종료된 질문입니다.');

    const { startedAt, endedAt } = await this.qnaManagerService.startQna(qnaId, qna.timeLimit);
    return {
      id: qnaId,
      title: qna.title,
      timeLimit: qna.timeLimit,
      startedAt,
      endedAt,
    };
  }

  /**
   * 종료된 질문 조회 로직
   * @param roomId 조회할 강의실 id
   */
  async getEndedQnas(roomId: string): Promise<Qna[]> {
    const qnas = await this.qnaManagerService.getQnasInRoom(roomId);
    return qnas.filter((qna) => qna.status === 'ended');
  }

  /**
   * 질문 제출 로직
   * @param qnaId 제출할 질문 id
   * @param participantId 제출한 참여자 id
   * @param participantName 제출한 참여자 이름
   * @param text 제출한 답변
   */
  async answer(
    qnaId: string,
    participantId: string,
    participantName: string,
    text: string,
  ): Promise<{
    audience: UpdateQnaSubPayload;
    presenter: UpdateQnaFullPayload;
  }> {
    const qna = await this.qnaManagerService.findOne(qnaId);
    if (!qna) throw new BusinessException('존재하지 않는 질문입니다.');

    const result = await this.qnaManagerService.submitAnswer(
      qnaId,
      participantId,
      participantName,
      text,
    );

    const audiencePayload: UpdateQnaSubPayload = {
      qnaId: qnaId,
      text,
      count: result.count,
    };

    const payload: UpdateQnaFullPayload = {
      qnaId: qnaId,
      participantId,
      participantName,
      text,
      count: result.count,
    };

    if (qna.isPublic) {
      return { audience: audiencePayload, presenter: payload };
    } else {
      return {
        audience: { qnaId: payload.qnaId, count: payload.count },
        presenter: payload,
      };
    }
  }

  /**
   * 종료된 질문 조회 로직
   * @param qnaId 종료할 질문 id
   */
  async stopQna(
    qnaId: string,
  ): Promise<{ audience: EndQnaPayload; presenter: EndQnaDetailPayload }> {
    const qna = await this.qnaManagerService.findOne(qnaId);
    if (!qna) throw new BusinessException('존재하지 않는 질문입니다.');

    const answers =
      qna.status === 'ended'
        ? await this.qnaManagerService.getFinalResults(qnaId)
        : await this.qnaManagerService.closeQna(qnaId);

    const audiencePayload: EndQnaPayload = {
      qnaId: qna.id,
      title: qna.title,
      count: answers.length,
      text: answers.map((a) => a.text),
    };
    const payload: EndQnaDetailPayload = {
      qnaId: qna.id,
      title: qna.title,
      count: answers.length,
      answers,
    };

    if (qna.isPublic) {
      return { audience: audiencePayload, presenter: payload };
    } else {
      return {
        audience: { qnaId: payload.qnaId, title: payload.title, count: payload.count },
        presenter: payload,
      };
    }
  }

  /**
   * 강의실 종료 시 활성화되어 있는 질문을 종료하는 로직
   * @param roomId 종료할 강의실 id
   */
  async stopAllActiveQna(roomId: string): Promise<void> {
    const qnas = await this.qnaManagerService.getQnasInRoom(roomId);
    const activeQnas = qnas.filter((qna) => qna.status === 'active');
    if (activeQnas.length === 0) return;

    const closePromises = activeQnas.map((qna) => this.qnaManagerService.closeQna(qna.id));
    await Promise.all(closePromises);
  }
}
