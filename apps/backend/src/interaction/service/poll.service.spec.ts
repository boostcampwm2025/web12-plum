import { Test, TestingModule } from '@nestjs/testing';
import { PollManagerService } from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';
import { PollService } from './poll.service.js';

describe('pollService (투표 생성 테스트)', () => {
  let service: PollService;

  const mockPollManager = {
    addPollToRoom: jest.fn(),
    getPollsInRoom: jest.fn(),
    findOne: jest.fn(),
    startPoll: jest.fn(),
    submitVote: jest.fn(),
    closePoll: jest.fn(),
    getFinalResults: jest.fn(),
    getVoteCounts: jest.fn(),
    getMultiVoteCounts: jest.fn(),
    getVoteGroups: jest.fn(),
    getVotedOptionId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        {
          provide: PollManagerService,
          useValue: mockPollManager,
        },
      ],
    }).compile();

    service = module.get<PollService>(PollService);
    jest.clearAllMocks();
  });

  describe('createPoll (투표 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Poll 객체로 출력되고 저장되어야 한다', async () => {
      const roomId = 'absed-1';
      const createPollDto = {
        title: '오늘 점심 메뉴는?',
        options: [{ value: '치킨' }, { value: '피자' }],
        timeLimit: 60,
      };

      const result = await service.createPoll(roomId, createPollDto);

      // 객체 구조 검증
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createPollDto.title);
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toMatchObject({ id: 0, value: '치킨', count: 0 });

      // 저장 함수 호출 확인
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledWith(roomId, [result]);
    });
  });

  describe('createMultiplePoll (복수 투표 생성)', () => {
    it('배열로 입력된 데이터만큼 객체가 생성되고 saveMany가 호출되어야 한다', async () => {
      const roomId = 'room-123';
      const pollsDto = [
        { title: '투표 1', options: [{ value: 'A' }], timeLimit: 30 },
        { title: '투표 2', options: [{ value: 'B' }], timeLimit: 30 },
      ];

      const results = await service.createMultiplePoll(roomId, pollsDto);

      expect(results).toHaveLength(2);
      // saveMany가 한 번 호출되었는지 확인 (Pipeline 방식)
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledTimes(1);
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledWith(roomId, results);
    });

    it('빈 배열이 입력되면 빈 배열을 반환하고 저장 로직을 타지 않아야 한다', async () => {
      const result = await service.createMultiplePoll('room-1', []);
      expect(result).toEqual([]);
      expect(mockPollManager.addPollToRoom).not.toHaveBeenCalled();
    });
  });

  describe('getPoll', () => {
    it('존재하는 투표 ID를 넣으면 투표 정보를 반환해야 한다', async () => {
      const mockPoll = { id: 'p1', title: 'test' };
      mockPollManager.findOne.mockResolvedValue(mockPoll as any);

      const result = await service.getPoll('p1');

      expect(result).toEqual(mockPoll);
    });

    it('투표가 없으면 "Could not find poll" 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.getPoll('none')).rejects.toThrow('Could not find poll');
    });
  });

  describe('getPolls (투표 목록 조회)', () => {
    it('roomId에 해당하는 투표 리스트 배열을 반환해야 한다', async () => {
      const roomId = 'room-123';
      const mockPolls = [
        {
          id: 'poll-active',
          title: '질문 1',
          status: 'active',
          options: [
            { id: 0, value: 'A' },
            { id: 1, value: 'B' },
          ],
        },
      ];

      mockPollManager.getPollsInRoom.mockResolvedValue(mockPolls);
      mockPollManager.getVoteGroups.mockResolvedValue({
        0: [{ id: 'u1', name: 'A' }],
        1: [{ id: 'u2', name: 'B' }],
      });
      mockPollManager.getMultiVoteCounts.mockResolvedValue({
        'poll-active': { 0: 3, 1: 5 },
      });

      const result = await service.getPolls(roomId);

      expect(result).toHaveLength(1);
      expect(result[0].options).toEqual([
        { id: 0, value: 'A', count: 3, voters: [{ id: 'u1', name: 'A' }] },
        { id: 1, value: 'B', count: 5, voters: [{ id: 'u2', name: 'B' }] },
      ]);
      expect(mockPollManager.getMultiVoteCounts).toHaveBeenCalledWith(['poll-active']);
      expect(mockPollManager.getVoteGroups).toHaveBeenCalledWith('poll-active');
    });

    it('투표가 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockPollManager.getPollsInRoom.mockResolvedValue([]);

      const result = await service.getPolls('empty-room');

      expect(result).toEqual([]);
      expect(mockPollManager.getPollsInRoom).toHaveBeenCalledWith('empty-room');
    });

    it('진행 중인 투표가 있으면 카운트를 합쳐서 반환해야 한다', async () => {
      const roomId = 'room-active';
      const mockPolls = [
        {
          id: 'poll-active',
          status: 'active',
          options: [
            { id: 0, value: 'A', count: 0, voters: [] },
            { id: 1, value: 'B', count: 0, voters: [] },
          ],
        },
      ];

      mockPollManager.getPollsInRoom.mockResolvedValue(mockPolls);
      mockPollManager.getMultiVoteCounts.mockResolvedValue({
        'poll-active': { 0: 3, 1: 5 },
      });
      mockPollManager.getVoteGroups.mockImplementation(async (pollId: string) => {
        if (pollId === 'poll-active') return { 0: [{ id: 'u1', name: 'A' }] };
        return {};
      });

      const result = await service.getPolls(roomId);

      expect(result[0].options).toEqual([
        { id: 0, value: 'A', count: 3, voters: [{ id: 'u1', name: 'A' }] },
        { id: 1, value: 'B', count: 5, voters: [] },
      ]);
      expect(mockPollManager.getMultiVoteCounts).toHaveBeenCalledWith(['poll-active']);
    });

    it('진행 중인 투표가 여러 개면 각각의 카운트를 합쳐서 반환해야 한다', async () => {
      const roomId = 'room-multi-active';
      const mockPolls = [
        {
          id: 'poll-1',
          status: 'active',
          options: [
            { id: 0, value: 'A', count: 0 },
            { id: 1, value: 'B', count: 0 },
          ],
        },
        {
          id: 'poll-2',
          status: 'active',
          options: [
            { id: 0, value: 'C', count: 0 },
            { id: 1, value: 'D', count: 0 },
          ],
        },
        {
          id: 'poll-3',
          status: 'closed',
          options: [{ id: 0, value: 'E', count: 1 }],
        },
      ];

      mockPollManager.getPollsInRoom.mockResolvedValue(mockPolls);
      mockPollManager.getMultiVoteCounts.mockResolvedValue({
        'poll-1': { 0: 2, 1: 4 },
        'poll-2': { 0: 1, 1: 3 },
      });

      const result = await service.getPolls(roomId);

      expect(result[0].options).toEqual([
        { id: 0, value: 'A', count: 2, voters: [] },
        { id: 1, value: 'B', count: 4, voters: [] },
      ]);
      expect(result[1].options).toEqual([
        { id: 0, value: 'C', count: 1, voters: [] },
        { id: 1, value: 'D', count: 3, voters: [] },
      ]);
      expect(result[2]).toEqual(mockPolls[2]);
      expect(mockPollManager.getMultiVoteCounts).toHaveBeenCalledWith(['poll-1', 'poll-2']);
    });
  });

  describe('getActivePoll (진행 중 투표 조회)', () => {
    it('진행 중인 투표가 없으면 null을 반환해야 한다', async () => {
      mockPollManager.getPollsInRoom.mockResolvedValue([]);

      const result = await service.getActivePoll('room-1', 'participant-1');

      expect(result).toEqual({ poll: null, votedOptionId: null });
    });

    it('진행 중인 투표가 있으면 카운트와 선택 정보를 포함해 반환해야 한다', async () => {
      const activePoll = {
        id: 'poll-1',
        title: '테스트',
        status: 'active',
        timeLimit: 60,
        startedAt: 'start',
        endedAt: 'end',
        options: [
          { id: 0, value: 'A', count: 0, voters: [] },
          { id: 1, value: 'B', count: 0, voters: [] },
        ],
      };

      mockPollManager.getPollsInRoom.mockResolvedValue([activePoll]);
      mockPollManager.getVoteCounts.mockResolvedValue({ 0: 2, 1: 4 });
      mockPollManager.getVotedOptionId.mockResolvedValue(1);

      const result = await service.getActivePoll('room-1', 'participant-1');

      expect(result.poll).toEqual({
        id: 'poll-1',
        title: '테스트',
        options: [
          { id: 0, value: 'A', count: 2, voters: [] },
          { id: 1, value: 'B', count: 4, voters: [] },
        ],
        timeLimit: 60,
        startedAt: 'start',
        endedAt: 'end',
      });
      expect(result.votedOptionId).toBe(1);
      expect(mockPollManager.getVoteCounts).toHaveBeenCalledWith('poll-1');
      expect(mockPollManager.getVotedOptionId).toHaveBeenCalledWith('poll-1', 'participant-1');
    });
  });

  describe('startPoll (투표 시작)', () => {
    const pollId = 'poll-ulid-123';
    const mockPoll = {
      id: pollId,
      title: '테스트 투표',
      status: 'pending',
      timeLimit: 60,
      options: [{ id: 0, value: '옵션1', count: 0 }],
    };

    it('대기 중인 투표를 시작하고 PollPayload를 반환해야 한다', async () => {
      const startedAt = new Date().toISOString();
      const endedAt = new Date(Date.now() + 60000).toISOString();

      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.startPoll.mockResolvedValue({ startedAt, endedAt });

      const result = await service.startPoll(pollId);

      expect(mockPollManager.findOne).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.startPoll).toHaveBeenCalledWith(pollId, mockPoll.timeLimit);

      expect(result).toEqual({
        id: pollId,
        title: mockPoll.title,
        options: mockPoll.options,
        timeLimit: mockPoll.timeLimit,
        startedAt,
        endedAt,
      });
    });

    it('존재하지 않는 투표인 경우 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.startPoll('invalid-id')).rejects.toThrow('존재하지 않는 투표입니다.');
    });

    it('이미 진행 중(active)인 투표를 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue({
        ...mockPoll,
        status: 'active',
      });

      await expect(service.startPoll(pollId)).rejects.toThrow('이미 시작되거나 종료된 투표입니다.');
    });

    it('이미 종료(closed)된 투표를 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue({
        ...mockPoll,
        status: 'closed',
      });

      await expect(service.startPoll(pollId)).rejects.toThrow('이미 시작되거나 종료된 투표입니다.');
    });
  });

  describe('vote (투표 제출)', () => {
    const pollId = 'poll-123';
    const participantId = 'user-999';
    const participantName = 'user-999';
    const mockPoll = {
      id: pollId,
      status: 'active',
      options: [
        { id: 0, value: '치킨', count: 0 },
        { id: 1, value: '피자', count: 0 },
      ],
    };

    beforeEach(() => {
      mockPollManager.submitVote = jest.fn();
    });

    it('유효한 선택지에 투표하면 업데이트된 옵션 목록을 반환해야 한다', async () => {
      const optionId = 0;
      const mockUpdateResult = {
        pollId,
        options: [
          { id: 0, count: 2 },
          { id: 1, count: 3 },
        ],
      };

      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.submitVote.mockResolvedValue(mockUpdateResult);

      const result = await service.vote(pollId, participantId, participantName, optionId);

      expect(mockPollManager.findOne).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.submitVote).toHaveBeenCalledWith(
        pollId,
        participantId,
        participantName,
        optionId,
      );
      expect(result).toEqual({
        pollId,
        options: mockUpdateResult.options,
      });
    });

    it('존재하지 않는 투표에 투표하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.vote('invalid-id', participantId, participantName, 0)).rejects.toThrow(
        '존재하지 않는 투표입니다.',
      );

      expect(mockPollManager.submitVote).not.toHaveBeenCalled();
    });

    it('유효하지 않은 옵션 ID(범위 초과)로 투표하려 하면 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);
      const invalidOptionId = 5; // mockPoll.options는 인덱스 0, 1만 존재

      await expect(
        service.vote(pollId, participantId, participantName, invalidOptionId),
      ).rejects.toThrow('유효하지 않은 선택지입니다.');

      expect(mockPollManager.submitVote).not.toHaveBeenCalled();
    });

    it('음수 옵션 ID로 투표하려 하면 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);

      await expect(service.vote(pollId, participantId, participantName, -1)).rejects.toThrow(
        '유효하지 않은 선택지입니다.',
      );
    });

    it('Manager에서 발생한 에러(중복 투표 등)는 그대로 위로 던져져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.submitVote.mockRejectedValue(new Error('Duplicate vote attempt'));

      await expect(service.vote(pollId, participantId, participantName, 0)).rejects.toThrow(
        'Duplicate vote attempt',
      );
    });
  });

  describe('stopPoll (투표 종료)', () => {
    const pollId = 'poll-123';
    const mockOptions = [
      { id: 0, value: '옵션1', count: 5, voters: ['user1'] },
      { id: 1, value: '옵션2', count: 3, voters: ['user2'] },
    ];

    it('존재하지 않는 투표 ID인 경우 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.stopPoll(pollId)).rejects.toThrow(
        new BusinessException('존재하지 않는 투표입니다.'),
      );
    });

    it('이미 종료된(ended) 투표인 경우 getFinalResults를 호출하여 결과를 반환해야 한다', async () => {
      const endedPoll = { id: pollId, status: 'ended', title: '종료된 투표' };
      mockPollManager.findOne.mockResolvedValue(endedPoll);
      mockPollManager.getFinalResults.mockResolvedValue(mockOptions);

      const result = await service.stopPoll(pollId);

      expect(mockPollManager.getFinalResults).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.closePoll).not.toHaveBeenCalled();
      expect(result).toEqual({ title: endedPoll.title, options: mockOptions });
    });

    it('진행 중인 투표인 경우 closePoll을 호출하여 투표를 마감하고 결과를 반환해야 한다', async () => {
      const activePoll = { id: pollId, status: 'active', title: '진행중 투표' };
      mockPollManager.findOne.mockResolvedValue(activePoll);
      mockPollManager.closePoll.mockResolvedValue(mockOptions);

      const result = await service.stopPoll(pollId);

      expect(mockPollManager.closePoll).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.getFinalResults).not.toHaveBeenCalled(); // getFinalResults는 호출되면 안 됨
      expect(result).toEqual({ title: activePoll.title, options: mockOptions });
    });
  });
});
