import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import {
  Poll,
  PollOption,
  PollPayload,
  Qna,
  UpdatePollStatusSubPayload,
} from '@plum/shared-interfaces';

import { CreatePollDto, CreateQnaDto } from './dto';
import { PollManagerService, QnaManagerService } from '../redis/repository-manager/index.js';
import { BusinessException } from '../common/types/index.js';

@Injectable()
export class InteractionService {
  constructor(
    private readonly pollManagerService: PollManagerService,
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
        voters: [],
      })),
      createdAt: now,
      updatedAt: now,
      startedAt: '',
      endedAt: '',
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
    await this.pollManagerService.addPollToRoom(roomId, [poll]);
    return poll;
  }

  async createMultiplePoll(roomId: string, data: CreatePollDto[]): Promise<Poll[]> {
    if (!data || data.length === 0) return [];

    const polls = data.map((dto) => this.preparePoll(roomId, dto));

    await this.pollManagerService.addPollToRoom(roomId, polls);

    return polls;
  }

  async getPolls(roomId: string): Promise<Poll[]> {
    return await this.pollManagerService.getPollsInRoom(roomId);
  }

  async startPoll(pollId: string): Promise<PollPayload> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new BusinessException('존재하지 않는 투표입니다.');
    if (poll.status !== 'pending')
      throw new BusinessException('이미 시작되거나 종료된 투표입니다.');

    const { startedAt, endedAt } = await this.pollManagerService.startPoll(pollId, poll.timeLimit);
    return {
      id: pollId,
      title: poll.title,
      options: poll.options,
      timeLimit: poll.timeLimit,
      startedAt,
      endedAt,
    };
  }

  async vote(
    pollId: string,
    participantId: string,
    participantName: string,
    optionId: number,
  ): Promise<UpdatePollStatusSubPayload> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new BusinessException('존재하지 않는 투표입니다.');

    if (optionId < 0 || optionId >= poll.options.length) {
      throw new BusinessException('유효하지 않은 선택지입니다.');
    }

    const result = await this.pollManagerService.submitVote(
      pollId,
      participantId,
      participantName,
      optionId,
    );
    return { ...result };
  }

  async stopPoll(pollId: string): Promise<PollOption[]> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new BusinessException('존재하지 않는 투표입니다.');

    if (poll.status === 'ended') return await this.pollManagerService.getFinalResults(pollId);

    return await this.pollManagerService.closePoll(pollId);
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
