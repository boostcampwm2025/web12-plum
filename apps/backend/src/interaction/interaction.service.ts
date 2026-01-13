import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { Poll, PollOption, Qna } from '@plum/shared-interfaces';

import { CreatePollDto, CreateQnaDto } from './dto';
import { InteractionRepository } from './interaction.repository.js';

@Injectable()
export class InteractionService {
  constructor(private readonly interactionRepository: InteractionRepository) {}

  async createPoll(dto: CreatePollDto): Promise<Poll> {
    const pollId = ulid();
    const key = `poll:${pollId}`;
    const date = new Date();

    const options: PollOption[] = dto.options.map((option, index) => ({
      id: index,
      value: option.value,
      count: 0,
    }));

    const newPoll: Poll = {
      id: pollId,
      ...dto,
      options,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };

    await this.interactionRepository.savePoll(key, newPoll, -1);
    return newPoll;
  }

  async createQna(dto: CreateQnaDto): Promise<Qna> {
    const qnaId = ulid();
    const key = `qna:${qnaId}`;
    const date = new Date();
    const newQna: Qna = {
      id: qnaId,
      ...dto,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };

    await this.interactionRepository.savePoll(key, newQna, -1);
    return newQna;
  }
}
