import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { Poll, PollOption, Qna } from '@plum/shared-interfaces';

import { CreatePollDto, CreateQnaDto } from './dto';
import { InteractionRepository } from './interaction.repository.js';

@Injectable()
export class InteractionService {
  constructor(private readonly interactionRepository: InteractionRepository) {}

  async createPoll(roomId: string, dto: CreatePollDto): Promise<Poll> {
    const id = ulid();
    const key = `poll:${id}`;
    const date = new Date();

    const options: PollOption[] = dto.options.map((option, index) => ({
      id: index,
      value: option.value,
      count: 0,
    }));

    const newPoll: Poll = {
      id,
      roomId,
      status: 'pending',
      ...dto,
      options,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };

    await this.interactionRepository.savePoll(key, newPoll, -1);
    return newPoll;
  }

  async createMultiplePoll(roomId: string, data: CreatePollDto[]): Promise<Poll[]> {
    if (!data || data.length === 0) return [];

    return await Promise.all(data.map((poll) => this.createPoll(roomId, poll)));
  }

  async createQna(roomId: string, dto: CreateQnaDto): Promise<Qna> {
    const id = ulid();
    const key = `qna:${id}`;
    const date = new Date();
    const newQna: Qna = {
      id: id,
      roomId,
      status: 'pending',
      ...dto,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };

    await this.interactionRepository.savePoll(key, newQna, -1);
    return newQna;
  }

  async createMultipleQna(roomId: string, data: CreateQnaDto[]): Promise<Qna[]> {
    if (!data || data.length === 0) return [];

    return await Promise.all(data.map((qna) => this.createQna(roomId, qna)));
  }
}
