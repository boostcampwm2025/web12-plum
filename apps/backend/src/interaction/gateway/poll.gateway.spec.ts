import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PollService } from '../service/index.js';
import {
  ActivityScoreManagerService,
  ParticipantManagerService,
  RoomManagerService,
} from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';
import { SocketMetadataService } from '../../common/services/index.js';
import { PollGateway } from './poll.gateway.js';

describe('PollGateway', () => {
  let gateway: PollGateway;
  let pollService: PollService;
  let activityScoreManager: ActivityScoreManagerService;
  let mockServer: Server;
  let mockSocket: Socket;

  const roomId = 'room-abc';
  const participantId = 'user-xyz';
  const participantName = '유저1';

  beforeEach(async () => {
    // 소켓 및 가드 데이터 모킹
    mockSocket = {
      id: 'socket-id',
      data: {
        room: { id: roomId },
        participant: { id: participantId, name: participantName },
      },
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Socket;

    // 서버 모킹
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: SocketMetadataService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ParticipantManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: RoomManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: PollService,
          useValue: {
            createPoll: jest.fn(),
            getPolls: jest.fn(),
            getActivePoll: jest.fn(),
            startPoll: jest.fn(),
            vote: jest.fn(),
            stopPoll: jest.fn(),
            getPoll: jest.fn(),
          },
        },
        {
          provide: ActivityScoreManagerService,
          useValue: { updateScore: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<PollGateway>(PollGateway);
    pollService = module.get<PollService>(PollService);
    activityScoreManager = module.get<ActivityScoreManagerService>(ActivityScoreManagerService);

    (gateway as any).server = mockServer;
  });

  describe('creatPoll', () => {
    const pollData = { title: '투표 제목', options: ['A', 'B'] };

    it('투표를 생성하고 success: true를 반환해야 한다', async () => {
      jest.spyOn(pollService, 'createPoll').mockResolvedValue({ id: 'p1' } as any);
      const result = await gateway.creatPoll(mockSocket, pollData as any);
      expect(result).toEqual({ success: true });
      expect(pollService.createPoll).toHaveBeenCalledWith(roomId, pollData);
    });

    it('에러 발생 시 BusinessException 메시지를 반환해야 한다', async () => {
      jest.spyOn(pollService, 'createPoll').mockRejectedValue(new BusinessException('생성 제한'));
      const result = await gateway.creatPoll(mockSocket, pollData as any);
      expect(result).toEqual({ success: false, error: '생성 제한' });
    });
  });

  describe('getActivePoll', () => {
    it('진행 중인 투표가 없으면 에러 메시지를 반환한다', async () => {
      jest
        .spyOn(pollService, 'getActivePoll')
        .mockResolvedValue({ poll: null, votedOptionId: null });
      const result = await gateway.getActivePoll(mockSocket);
      expect(result.success).toBe(false);
    });

    it('진행 중인 투표가 있으면 투표 정보를 반환한다', async () => {
      const activeData = { poll: { id: 'p1' }, votedOptionId: 'opt-1' };
      jest.spyOn(pollService, 'getActivePoll').mockResolvedValue(activeData as any);
      const result = await gateway.getActivePoll(mockSocket);
      expect(result).toEqual({ success: true, ...activeData });
    });
  });

  describe('vote', () => {
    const voteData = { pollId: 'p1', optionId: 1, isGesture: true };

    it('투표 시 제스처 여부에 따라 점수를 업데이트하고 타겟별로 전송해야 한다', async () => {
      const payload = { pollId: 'p1', options: [] };
      jest.spyOn(pollService, 'vote').mockResolvedValue(payload as any);

      await gateway.vote(mockSocket, voteData);

      expect(activityScoreManager.updateScore).toHaveBeenCalledWith(
        roomId,
        participantId,
        'vote_gesture',
      );

      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:audience`);
      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:presenter`);
      expect(mockServer.emit).toHaveBeenCalledWith('update_poll', payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'update_poll_detail',
        expect.objectContaining({
          voter: { participantId, name: participantName, optionId: 1 },
        }),
      );
    });
  });

  describe('breakPoll', () => {
    it('수동 종료 시 poll_end 이벤트를 보내고 결과를 반환해야 한다', async () => {
      const mockOptions = [
        { id: 0, value: '옵션1', count: 10, voters: ['u1', 'u2'] },
        { id: 1, value: '옵션2', count: 5, voters: ['u3'] },
      ];
      const stopResult = { title: '제목', options: mockOptions };
      jest.spyOn(pollService, 'stopPoll').mockResolvedValue(stopResult as any);

      const result = await gateway.breakPoll(mockSocket, { pollId: 'p1' });

      expect(result).toEqual({ success: true, options: mockOptions });
      expect(mockSocket.to).toHaveBeenCalledWith(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'poll_end',
        expect.objectContaining({ pollId: 'p1' }),
      );
    });
  });

  describe('handleAutoClosedPollEvent', () => {
    it('자동 종료 이벤트 수신 시 데이터를 가공하여 발표자와 청중에게 전송해야 한다', async () => {
      const mockPoll = { id: 'p1', roomId, title: '투표' };
      const results = [{ id: 'o1', value: 'Val', count: 10 }];

      jest.spyOn(pollService, 'getPoll').mockResolvedValue(mockPoll as any);

      await gateway.handleAutoClosedPollEvent({ pollId: 'p1', results: results as any });

      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:presenter`);
      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:audience`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'poll_end',
        expect.objectContaining({
          options: [{ id: 'o1', value: 'Val', count: 10 }],
        }),
      );
    });

    it('DB 조회 실패 시 에러를 로깅해야 한다', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
      jest.spyOn(pollService, 'getPoll').mockRejectedValue(new Error('Redis Error'));

      await gateway.handleAutoClosedPollEvent({ pollId: 'err', results: [] });

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
