import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { Poll, Qna } from '@plum/shared-interfaces';

import { CreatePollDto, CreateQnaDto } from './dto';
import { PollManagerService, QnaManagerService } from '../redis/repository-manager/index.js';

@Injectable()
export class InteractionService {
  constructor(
    private readonly pollMangerService: PollManagerService,
    private readonly qnaManagerService: QnaManagerService,
  ) {}

  /**
   * Poll 데이터 가공 로직
   */
  private preparePoll(roomId: string, dto: CreatePollDto): Poll {
    const id = ulid();
    const now = new Date().toISOString();
    return {
      id,
      roomId,
      status: 'pending',
      ...dto,
      options: dto.options.map((option, index) => ({
        id: index,
        value: option.value,
        count: 0,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * QnA 데이터 가공 로직
   */
  private prepareQna(roomId: string, dto: CreateQnaDto): Qna {
    const id = ulid();
    const now = new Date().toISOString();
    return {
      id,
      roomId,
      status: 'pending',
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
  }

  // --- Poll Methods ---
  async createPoll(roomId: string, dto: CreatePollDto): Promise<Poll> {
    const poll = this.preparePoll(roomId, dto);
    await this.pollMangerService.saveOne(poll.id, poll);
    return poll;
  }

  async createMultiplePoll(roomId: string, data: CreatePollDto[]): Promise<Poll[]> {
    if (!data || data.length === 0) return [];

    const polls = data.map((dto) => this.preparePoll(roomId, dto));

    await this.pollMangerService.saveMany(polls);

    return polls;
  }

  // --- QnA Methods ---
  async createQna(roomId: string, dto: CreateQnaDto): Promise<Qna> {
    const qna = this.prepareQna(roomId, dto);
    await this.qnaManagerService.saveOne(qna.id, qna);
    return qna;
  }

  async createMultipleQna(roomId: string, data: CreateQnaDto[]): Promise<Qna[]> {
    if (!data || data.length === 0) return [];
    const qnas = data.map((dto) => this.prepareQna(roomId, dto));
    await this.qnaManagerService.saveMany(qnas);
    return qnas;
  }
}
