import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import {
  EndQnaDetailPayload,
  EndQnaPayload,
  Poll,
  PollOption,
  PollPayload,
  Qna,
  QnaPayload,
  UpdatePollStatusSubPayload,
  UpdateQnaFullPayload,
  UpdateQnaSubPayload,
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
      answers: [],
      createdAt: now,
      updatedAt: now,
      startedAt: '',
      endedAt: '',
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

  async getPoll(pollId: string): Promise<Poll> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new Error('Could not find poll');

    return poll;
  }

  async getPolls(roomId: string): Promise<Poll[]> {
    const polls = await this.pollManagerService.getPollsInRoom(roomId);
    const activePollIds = polls.filter((poll) => poll.status === 'active').map((poll) => poll.id);

    if (activePollIds.length === 0) return polls;

    const countsByPoll = await this.pollManagerService.getMultiVoteCounts(activePollIds);
    return polls.map((poll) => {
      if (poll.status !== 'active') return poll;

      const counts = countsByPoll[poll.id];
      if (!counts) return poll;

      return {
        ...poll,
        options: poll.options.map((option) => ({
          ...option,
          count: counts[option.id] ?? option.count,
        })),
      };
    });
  }

  async getActivePoll(
    roomId: string,
    participantId: string,
  ): Promise<{ poll: PollPayload | null; votedOptionId: number | null }> {
    const polls = await this.pollManagerService.getPollsInRoom(roomId);
    const activePoll = polls.find((poll) => poll.status === 'active');

    if (!activePoll) {
      return { poll: null, votedOptionId: null };
    }

    const counts = await this.pollManagerService.getVoteCounts(activePoll.id);
    const options = activePoll.options.map((option) => ({
      ...option,
      count: counts[option.id] ?? option.count,
      voters: [],
    }));

    const pollPayload: PollPayload = {
      id: activePoll.id,
      title: activePoll.title,
      options,
      timeLimit: activePoll.timeLimit,
      startedAt: activePoll.startedAt,
      endedAt: activePoll.endedAt,
    };

    const votedOptionId = await this.pollManagerService.getVotedOptionId(
      activePoll.id,
      participantId,
    );

    return { poll: pollPayload, votedOptionId };
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

  async stopPoll(pollId: string): Promise<{ title: string; options: PollOption[] }> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new BusinessException('존재하지 않는 투표입니다.');

    if (poll.status === 'ended') {
      return {
        title: poll.title,
        options: await this.pollManagerService.getFinalResults(pollId),
      };
    }

    return {
      title: poll.title,
      options: await this.pollManagerService.closePoll(pollId),
    };
  }

  // --- QnA Methods ---
  async createQna(roomId: string, dto: CreateQnaDto): Promise<Qna> {
    const qna = this.prepareQna(roomId, dto);
    await this.qnaManagerService.addQnaToRoom(roomId, [qna]);
    return qna;
  }

  async createMultipleQna(roomId: string, data: CreateQnaDto[]): Promise<Qna[]> {
    if (!data || data.length === 0) return [];

    const qnas = data.map((dto) => this.prepareQna(roomId, dto));
    await this.qnaManagerService.addQnaToRoom(roomId, qnas);
    return qnas;
  }

  async getQna(qnaId: string): Promise<Qna> {
    const poll = await this.qnaManagerService.findOne(qnaId);
    if (!poll) throw new Error('Could not find qna');

    return poll;
  }

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
}
