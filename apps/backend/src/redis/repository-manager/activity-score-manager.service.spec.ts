import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityScoreManagerService } from './activity-score-manager.service';
import { RedisService } from '../redis.service';
import { ParticipantManagerService } from './participant-manager.service.js';
import { RANK_LIMIT } from '@plum/shared-interfaces';

describe('ActivityScoreManagerService', () => {
  let service: ActivityScoreManagerService;
  let participantManagerService: ParticipantManagerService;
  let eventEmitter: EventEmitter2;

  const pipelineMock = {
    hincrby: jest.fn().mockReturnThis(),
    hset: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    zadd: jest.fn().mockResolvedValue([]),
  };

  const redisClientMock = {
    zscore: jest.fn(),
    zadd: jest.fn(),
    zrevrange: jest.fn(),
    zrange: jest.fn(),
    zcard: jest.fn(),
    keys: jest.fn(),
    pipeline: jest.fn(() => pipelineMock),
    hget: jest.fn(),
    hincrby: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityScoreManagerService,
        {
          provide: RedisService,
          useValue: { getClient: () => redisClientMock },
        },
        {
          provide: ParticipantManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() }, // EventEmitter 모킹
        },
      ],
    }).compile();

    service = module.get<ActivityScoreManagerService>(ActivityScoreManagerService);
    participantManagerService = module.get<ParticipantManagerService>(ParticipantManagerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeParticipantScore', () => {
    it('참가자 입장 시 0점과 우선순위 소수점을 포함하여 초기화해야 한다', async () => {
      const roomId = 'room1';
      const pId = 'new-user';

      await service.initializeParticipantScore(roomId, pId);

      expect(redisClientMock.zadd).toHaveBeenCalledWith(
        `room:${roomId}:scores`,
        expect.any(Number),
        pId,
      );
    });
  });

  describe('updateScore', () => {
    const roomId = 'room1';
    const pId = 'user1';
    const activity = 'chat'; // 점수: 3
    it('활동에 따른 점수를 업데이트하고 이벤트를 발행해야 한다', async () => {
      redisClientMock.zscore.mockResolvedValue('10.9999'); // 기존 10점
      redisClientMock.zcard.mockResolvedValue(1);
      redisClientMock.zrevrange.mockResolvedValue(['user1', '13.1234']); // 업데이트 후 랭킹 조회 결과 모킹
      redisClientMock.zrange.mockResolvedValue(['u1', '8.0']);
      redisClientMock.hget.mockResolvedValue('0');
      (participantManagerService.findOne as jest.Mock).mockResolvedValue({ name: '테스터' });

      await service.updateScore(roomId, pId, activity);

      expect(redisClientMock.zadd).toHaveBeenCalledWith(
        `room:${roomId}:scores`,
        expect.any(Number),
        pId,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('activity.score.updated', {
        roomId,
        participantId: pId,
        score: 13,
        penaltyCount: 0,
        reason: activity,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'activity.rank.changed',
        expect.objectContaining({
          roomId,
          top: expect.any(Array),
          lowest: expect.any(Object),
        }),
      );
    });

    it(`참가자가 ${RANK_LIMIT + 1}명 미만일 경우 lowest는 null로 발행되어야 한다`, async () => {
      redisClientMock.zcard.mockResolvedValue(RANK_LIMIT);

      await service.updateScore(roomId, pId, 'gesture');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'activity.rank.changed',
        expect.objectContaining({
          lowest: null,
        }),
      );
      expect(redisClientMock.zrange).not.toHaveBeenCalled();
    });

    it(`참가자가 ${RANK_LIMIT + 1}명 이상일 경우 lowest 정보가 포함되어 발행되어야 한다`, async () => {
      redisClientMock.zcard.mockResolvedValue(RANK_LIMIT + 1);
      redisClientMock.zrange.mockResolvedValue(['user4', '1.1234']);

      await service.updateScore(roomId, pId, 'gesture');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'activity.rank.changed',
        expect.objectContaining({
          lowest: expect.objectContaining({
            rank: 4,
            participantId: 'user4',
          }),
        }),
      );
    });
  });

  describe('applyPenalty', () => {
    const roomId = 'room1';
    const pId = 'user1';

    beforeEach(() => {
      // 랭킹 조회를 위한 기본 모킹
      redisClientMock.zcard.mockResolvedValue(1);
      redisClientMock.zrevrange.mockResolvedValue(['user1', '10.5']);
      (participantManagerService.findOne as jest.Mock).mockResolvedValue({ name: '테스터' });
    });

    it('일반 패널티: 패널티 횟수를 증가시키고 설정된 벌점만큼 점수를 차감해야 한다', async () => {
      // 1. 초기 상태 설정
      const initialPenaltyCount = 1;
      const initialScore = '100.999'; // 현재 100점
      const expectedScore = 50;

      redisClientMock.hincrby.mockResolvedValue(initialPenaltyCount);
      redisClientMock.zscore.mockResolvedValueOnce(initialScore).mockResolvedValueOnce('50.1234');

      await service.applyPenalty(roomId, pId);

      // 패널티 카운트 증가 확인
      expect(redisClientMock.hincrby).toHaveBeenCalledWith(
        `room:${roomId}:stats:${pId}`,
        'penaltyCount',
        1,
      );

      // 점수 차감 확인 (100점 - 50점 = 50.xxxx)
      const zaddCall = pipelineMock.zadd.mock.calls.find((call) => call[2] === pId);
      const scoreArg = zaddCall[1];
      expect(Math.floor(scoreArg)).toBe(50);

      // 이벤트 발행 확인
      expect(eventEmitter.emit).toHaveBeenCalledWith('activity.score.updated', {
        roomId,
        participantId: pId,
        score: expectedScore,
        penaltyCount: initialPenaltyCount,
        reason: 'penalty',
      });
    });

    it('크리티컬 패널티: 패널티 횟수가 임계치를 초과하면 점수를 0으로 초기화해야 한다', async () => {
      // 1. PENALTY_LIMIT을 초과하는 카운트 설정 (예: 6회)
      const criticalPenaltyCount = 6;
      redisClientMock.hincrby.mockResolvedValue(criticalPenaltyCount);
      redisClientMock.zscore.mockResolvedValue('0.1234');

      await service.applyPenalty(roomId, pId);

      // 점수가 0점대(우선순위 소수점만 존재)로 설정되었는지 확인
      const zaddCall = pipelineMock.zadd.mock.calls.find((call) => call[2] === pId);
      expect(Math.floor(zaddCall[1])).toBe(0);

      // 통계 해시의 점수도 0으로 명시적 설정 확인
      expect(pipelineMock.hset).toHaveBeenCalledWith(
        `room:${roomId}:stats:${pId}`,
        'participationScore',
        0,
      );

      // 이벤트 발행 사유가 critical_penalty인지 확인
      expect(eventEmitter.emit).toHaveBeenCalledWith('activity.score.updated', {
        roomId,
        participantId: pId,
        score: 0,
        penaltyCount: criticalPenaltyCount,
        reason: 'critical_penalty',
      });
    });

    it('점수가 벌점보다 낮을 경우, 0점 미만으로 내려가지 않아야 한다', async () => {
      const lowScore = '30.123'; // 현재 30점인데 벌점은 50점인 상황
      redisClientMock.hincrby.mockResolvedValue(1);
      redisClientMock.zscore.mockResolvedValueOnce(lowScore).mockResolvedValueOnce('0.1234');

      await service.applyPenalty(roomId, pId);

      // 30 - 50 = -20 이지만 Math.max(0, ...)에 의해 0점대로 기록되어야 함
      const zaddCall = pipelineMock.zadd.mock.calls.find((call) => call[2] === pId);
      expect(Math.floor(zaddCall[1])).toBe(0);
    });
  });

  describe('getParticipantScore', () => {
    const roomId = 'room1';
    const pId = 'user1';

    it('사용자의 점수가 존재할 경우, 소수점을 제외한 정수 점수만 반환해야 한다', async () => {
      redisClientMock.zscore.mockResolvedValue('15.2524');

      const result = await service.getParticipantScore(roomId, pId);

      expect(redisClientMock.zscore).toHaveBeenCalledWith(`room:${roomId}:scores`, pId);
      expect(result).toBe(15);
    });

    it('사용자의 데이터가 Redis에 없을 경우 0을 반환해야 한다', async () => {
      redisClientMock.zscore.mockResolvedValue(null);

      const result = await service.getParticipantScore(roomId, pId);

      expect(result).toBe(0);
    });

    it('점수가 0점이고 우선순위 소수점만 있는 경우 0을 반환해야 한다', async () => {
      redisClientMock.zscore.mockResolvedValue('0.9876');

      const result = await service.getParticipantScore(roomId, pId);

      expect(result).toBe(0);
    });
  });

  describe('getLowest', () => {
    it(`참가자가 ${RANK_LIMIT + 1}명 미만일 경우 null을 반환해야 한다 (최소 비교 대상 부재)`, async () => {
      redisClientMock.zcard.mockResolvedValue(1);
      const result = await service.getLowest('room1');
      expect(result).toBeNull();
    });

    it('참가자가 ${RANK_LIMIT + 1}명 이상일 때 가장 점수가 낮은 사람의 정보를 반환한다', async () => {
      const roomId = 'room1';
      redisClientMock.zcard.mockResolvedValue(RANK_LIMIT + 1);
      redisClientMock.zrange.mockResolvedValue(['user2', '5.5']);
      (participantManagerService.findOne as jest.Mock).mockResolvedValue({ name: '꼴찌' });

      const result = await service.getLowest(roomId);

      expect(result).toEqual(
        expect.objectContaining({
          rank: 4,
          participantId: 'user2',
          score: 5,
        }),
      );
    });
  });

  describe('clearScores', () => {
    it('방의 모든 데이터(ZSET, Stats)를 삭제해야 한다', async () => {
      const roomId = 'room1';
      redisClientMock.keys.mockResolvedValue(['room1:stats:u1', 'room1:stats:u2']);

      await service.clearScores(roomId);

      expect(pipelineMock.del).toHaveBeenCalledWith(`room:${roomId}:scores`);
      expect(pipelineMock.del).toHaveBeenCalledWith('room1:stats:u1', 'room1:stats:u2');
      expect(pipelineMock.exec).toHaveBeenCalled();
    });
  });
});
