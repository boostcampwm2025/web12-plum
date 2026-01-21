import { Test, TestingModule } from '@nestjs/testing';
import { Qna } from '@plum/shared-interfaces';
import { QnaManagerService } from './qna-manager.service.js';
import { RedisService } from '../redis.service.js';

describe('QnaManagerService', () => {
  let service: QnaManagerService;
  let redisClient: any;
  let pipeline: any;

  const mockQnas: Qna[] = [
    { id: 'qna-1', roomId: 'room-1', title: '질문입니다 1' } as Qna,
    { id: 'qna-2', roomId: 'room-1', title: '질문입니다 2' } as Qna,
  ];

  beforeEach(async () => {
    pipeline = {
      rpush: jest.fn().mockReturnThis(),
      lrem: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 'OK'],
        [null, 1],
      ]),
    };

    redisClient = {
      pipeline: jest.fn().mockReturnValue(pipeline),
      lrange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QnaManagerService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(redisClient),
          },
        },
      ],
    }).compile();

    service = module.get<QnaManagerService>(QnaManagerService);

    jest.spyOn(service as any, 'addSaveToPipeline').mockImplementation(() => {});
    jest.spyOn(service as any, 'addDeleteToPipeline').mockImplementation(() => {});
    jest.spyOn(service as any, 'findMany').mockResolvedValue(mockQnas);
  });

  describe('addQnaToRoom', () => {
    const roomId = 'room-1';
    const listKey = `room:${roomId}:qna`;

    it('QnA를 저장하고 강의실 리스트에 ID를 추가해야 한다', async () => {
      await service.addQnaToRoom(roomId, mockQnas);

      expect(redisClient.pipeline).toHaveBeenCalled();

      expect(service['addSaveToPipeline']).toHaveBeenCalledTimes(mockQnas.length);

      expect(pipeline.rpush).toHaveBeenCalledWith(listKey, mockQnas[0].id);
      expect(pipeline.rpush).toHaveBeenCalledWith(listKey, mockQnas[1].id);

      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('파이프라인 실행 결과에 에러가 포함되어 있으면 예외를 던지고 롤백을 수행해야 한다', async () => {
      pipeline.exec
        .mockResolvedValueOnce([[new Error('Redis Error'), null]]) // 첫 번째 시도 실패
        .mockResolvedValueOnce([[null, 1]]); // 롤백 시도 성공

      await expect(service.addQnaToRoom(roomId, mockQnas)).rejects.toThrow(
        'Pipeline execution failed partly',
      );

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);

      expect(service['addDeleteToPipeline']).toHaveBeenCalledTimes(mockQnas.length);
      expect(pipeline.lrem).toHaveBeenCalledWith(listKey, 0, mockQnas[0].id);
    });

    it('완전한 실패(try-catch) 발생 시에도 롤백을 수행해야 한다', async () => {
      pipeline.exec.mockRejectedValueOnce(new Error('Network Failure'));

      await expect(service.addQnaToRoom(roomId, mockQnas)).rejects.toThrow('Network Failure');

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);
      expect(pipeline.lrem).toHaveBeenCalled();
    });

    it('롤백 과정에서 에러가 발생해도 원래 에러를 던져야 한다 (Critical Log)', async () => {
      pipeline.exec
        .mockRejectedValueOnce(new Error('Main Error')) // 메인 실패
        .mockRejectedValueOnce(new Error('Rollback Error')); // 롤백도 실패

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.addQnaToRoom(roomId, mockQnas)).rejects.toThrow('Main Error');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL] Rollback failed'),
        expect.any(String),
      );
    });
  });

  describe('getQnasInRoom', () => {
    it('lrange로 ID를 조회한 후 상세 데이터를 반환해야 한다', async () => {
      const qnaIds = ['qna-1', 'qna-2'];
      redisClient.lrange.mockResolvedValue(qnaIds);

      const result = await service.getQnasInRoom('room-1');

      expect(redisClient.lrange).toHaveBeenCalledWith('room:room-1:qna', 0, -1);
      expect(service.findMany).toHaveBeenCalledWith(qnaIds);
      expect(result).toEqual(mockQnas);
    });

    it('빈 결과: 저장된 투표가 없으면 빈 배열을 반환해야 한다', async () => {
      redisClient.lrange.mockResolvedValue([]);

      const result = await service.getQnasInRoom('room-1');

      expect(result).toEqual([]);
      expect(service.findMany).not.toHaveBeenCalled();
    });
  });

  describe('startQna', () => {
    const qnaId = 'qna-123';
    const timeLimit = 60;
    const activeKey = `qna:${qnaId}:active`;

    const mockQna = {
      id: qnaId,
      status: 'pending',
    } as Qna;

    beforeEach(() => {
      pipeline.set = jest.fn().mockReturnThis();
      pipeline.del = jest.fn().mockReturnThis();

      jest.spyOn(service as any, 'addUpdatePartialToPipeline').mockImplementation(() => {});
      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockQna);
    });

    it('질문을 시작하고 상태를 active로 변경하며 타이머 키를 생성해야 한다', async () => {
      pipeline.exec.mockResolvedValueOnce([
        [null, 'OK'],
        [null, 'OK'],
      ]);

      const result = await service.startQna(qnaId, timeLimit);

      expect(service.findOne).toHaveBeenCalledWith(qnaId);

      expect(service['addUpdatePartialToPipeline']).toHaveBeenCalledWith(
        pipeline,
        qnaId,
        expect.objectContaining({
          status: 'active',
          startedAt: expect.any(String),
          endedAt: expect.any(String),
        }),
      );

      expect(pipeline.set).toHaveBeenCalledWith(activeKey, 'true', 'EX', timeLimit);

      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('endedAt');
    });

    it('존재하지 않는 질문 ID일 경우 에러를 던져야 한다', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.startQna(qnaId, timeLimit)).rejects.toThrow('Qna does not exist');
    });

    it('파이프라인 실행 에러 발생 시 상태를 pending으로 롤백해야 한다', async () => {
      pipeline.exec
        .mockResolvedValueOnce([[new Error('Redis Error'), null]])
        .mockResolvedValueOnce([[null, 'OK']]);

      await expect(service.startQna(qnaId, timeLimit)).rejects.toThrow('Pipeline execution failed');

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);

      expect(service['addUpdatePartialToPipeline']).toHaveBeenCalledWith(
        expect.anything(),
        qnaId,
        expect.objectContaining({ status: 'pending' }),
      );

      expect(pipeline.del).toHaveBeenCalledWith(activeKey);
    });

    it('롤백 과정에서도 실패할 경우 크리티컬 에러 로그를 남겨야 한다', async () => {
      pipeline.exec
        .mockRejectedValueOnce(new Error('Initial Fail'))
        .mockRejectedValueOnce(new Error('Rollback Fail'));

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.startQna(qnaId, timeLimit)).rejects.toThrow('Initial Fail');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[CRITICAL] StartQna rollback failed: ${qnaId}`),
        expect.any(String),
      );
    });
  });
  // });
});
