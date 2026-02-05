import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import {
  CreatePollRequest,
  Poll,
  PollOption,
  PollPayload,
  UpdatePollStatusSubPayload,
  Voter,
} from '@plum/shared-interfaces';

import { PollManagerService } from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';

@Injectable()
export class PollService {
  constructor(private readonly pollManagerService: PollManagerService) {}

  /**
   * 투표 객체 생성 로직
   * @param roomId 속한 강의실 id
   * @param dto 유저가 입력한 투표 Raw 데이터
   * @private
   */
  private preparePoll(roomId: string, dto: CreatePollRequest): Poll {
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
   * 투표 생성 로직
   * @param roomId 속한 강의실 id
   * @param dto 유저가 입력한 투표 Raw 데이터
   */
  async createPoll(roomId: string, dto: CreatePollRequest): Promise<Poll> {
    const poll = this.preparePoll(roomId, dto);
    await this.pollManagerService.addPollToRoom(roomId, [poll]);
    return poll;
  }

  /**
   * 투표 배열 생성 로직
   * @param roomId 속한 강의실 id
   * @param data 유저가 입력한 투표 Raw 데이터들
   */
  async createMultiplePoll(roomId: string, data: CreatePollRequest[]): Promise<Poll[]> {
    if (!data || data.length === 0) return [];

    const polls = data.map((dto) => this.preparePoll(roomId, dto));
    await this.pollManagerService.addPollToRoom(roomId, polls);
    return polls;
  }

  /**
   * 투표 조회 로직
   * @param pollId 조회할 투표 id
   */
  async getPoll(pollId: string): Promise<Poll> {
    const poll = await this.pollManagerService.findOne(pollId);
    if (!poll) throw new Error('Could not find poll');

    return poll;
  }

  /**
   * 강의실 투표 조회 로직
   * @param roomId 조회할 강의실 id
   */
  async getPolls(roomId: string): Promise<Poll[]> {
    const polls = await this.pollManagerService.getPollsInRoom(roomId);
    const activePollIds = polls.filter((poll) => poll.status === 'active').map((poll) => poll.id);

    if (activePollIds.length === 0) return polls;

    const countsByPoll = await this.pollManagerService.getMultiVoteCounts(activePollIds);
    const votersByPoll = new Map<string, Record<number, Voter[]>>(
      await Promise.all(
        activePollIds.map(async (pollId) => {
          const groups = await this.pollManagerService.getVoteGroups(pollId);
          return [pollId, groups] as const;
        }),
      ),
    );
    return polls.map((poll) => {
      if (poll.status !== 'active') return poll;

      const counts = countsByPoll[poll.id];
      if (!counts) return poll;

      const voterGroups = votersByPoll.get(poll.id) || {};

      return {
        ...poll,
        options: poll.options.map((option) => ({
          ...option,
          count: counts[option.id] ?? option.count,
          voters: voterGroups[option.id] ?? option.voters ?? [],
        })),
      };
    });
  }

  /**
   * 활성화된 투표 조회 로직
   * @param roomId 조회할 강의실 id
   * @param participantId 조회할 참여자 id
   */
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

  /**
   * 종료된 투표 조회 로직
   * @param roomId 조회할 강의실 id
   */
  async getEndedPolls(roomId: string): Promise<Poll[]> {
    const polls = await this.pollManagerService.getPollsInRoom(roomId);
    return polls.filter((poll) => poll.status === 'ended');
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

  /**
   * 투표 제출 로직
   * @param pollId 제출할 투표 id
   * @param participantId 제출한 참여자 id
   * @param participantName 제출한 참여자 이름
   * @param optionId 제출한 선택지 id
   */
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

  /**
   * 종료된 투표 조회 로직
   * @param pollId 종료할 투표 id
   */
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

  /**
   * 강의실 종료 시 활성화되어 있는 질문을 종료하는 로직
   */
  async stopAllActivePoll(roomId: string): Promise<void> {
    const poll = await this.pollManagerService.getPollsInRoom(roomId);
    const activePolls = poll.filter((poll) => poll.status === 'active');
    if (activePolls.length === 0) return;

    const closePromises = activePolls.map((poll) => this.pollManagerService.closePoll(poll.id));
    await Promise.all(closePromises);
  }
}
