import { Test, TestingModule } from '@nestjs/testing';
import { Qna } from '@plum/shared-interfaces';
import { QnaManagerService } from './qna-manager.service.js';
import { RedisService } from '../redis.service.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
      imports: [EventEmitterModule.forRoot()],
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

  describe('submitAnswer', () => {
    const qnaId = 'qna-123';
    const participantId = 'user-456';
    const participantName = '홍길동';
    const text = '질문에 대한 답변입니다.';

    const activeKey = `qna:${qnaId}:active`;
    const answerKey = `qna:${qnaId}:answers`;
    const answererKey = `qna:${qnaId}:answerers`;

    beforeEach(() => {
      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service as any, 'getAnswerListKey').mockReturnValue(answerKey);
      jest.spyOn(service as any, 'getAnswererSetKey').mockReturnValue(answererKey);

      redisClient.exists = jest.fn();
      redisClient.sadd = jest.fn();
      redisClient.rpush = jest.fn();
      redisClient.expire = jest.fn();
      redisClient.srem = jest.fn();
    });

    it('성공: 활성화된 질문에 처음 답변하는 경우 count를 반환해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1); // 활성화됨
      redisClient.sadd.mockResolvedValue(1); // 처음 답변함
      redisClient.rpush.mockResolvedValue(5); // 현재 5번째 답변

      const result = await service.submitAnswer(qnaId, participantId, participantName, text);

      expect(redisClient.exists).toHaveBeenCalledWith(activeKey);
      expect(redisClient.sadd).toHaveBeenCalledWith(answererKey, participantId);
      expect(redisClient.rpush).toHaveBeenCalledWith(answerKey, expect.any(String));
      expect(result).toEqual({ count: 5 });
    });

    it('실패: 질문이 활성화 상태가 아니면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(0); // 비활성화됨

      await expect(
        service.submitAnswer(qnaId, participantId, participantName, text),
      ).rejects.toThrow('Qna is not active');

      expect(redisClient.sadd).not.toHaveBeenCalled();
      expect(redisClient.rpush).not.toHaveBeenCalled();
    });

    it('실패: 이미 답변한 유저(중복)인 경우 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(0); // 이미 존재함

      await expect(
        service.submitAnswer(qnaId, participantId, participantName, text),
      ).rejects.toThrow('Duplicate answer attempt');

      expect(redisClient.rpush).not.toHaveBeenCalled();
    });

    it('롤백: rpush 중 에러 발생 시 sadd했던 유저 정보를 삭제해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(1);
      redisClient.rpush.mockRejectedValue(new Error('Redis Connection Fail'));

      await expect(
        service.submitAnswer(qnaId, participantId, participantName, text),
      ).rejects.toThrow('Redis Connection Fail');

      expect(redisClient.srem).toHaveBeenCalledWith(answererKey, participantId);
    });

    it('답변 데이터에 참가자 정보가 올바르게 포함되어야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(1);
      redisClient.rpush.mockResolvedValue(1);

      await service.submitAnswer(qnaId, participantId, participantName, text);

      const pushedData = JSON.parse(redisClient.rpush.mock.calls[0][1]);
      expect(pushedData).toEqual({
        participantId,
        participantName,
        text,
      });
    });
  });

  describe('closeQna', () => {
    const qnaId = 'qna-123';
    const activeKey = `qna:${qnaId}:active`;
    const answerKey = `qna:${qnaId}:answers`;
    const answererKey = `qna:${qnaId}:answerers`;

    const mockAnswers = [
      JSON.stringify({ participantId: 'u1', participantName: 'A', text: '답변1' }),
    ];

    beforeEach(() => {
      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service as any, 'getAnswerListKey').mockReturnValue(answerKey);
      jest.spyOn(service as any, 'getAnswererSetKey').mockReturnValue(answererKey);

      pipeline.del = jest.fn().mockReturnThis();
      pipeline.lrange = jest.fn().mockReturnThis();
      redisClient.del = jest.fn();

      jest.spyOn(service, 'findOne').mockResolvedValue({ id: qnaId } as any);
      jest.spyOn(service, 'updatePartial').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('성공: 질문을 종료하고 답변 목록을 반환해야 한다', async () => {
      pipeline.exec.mockResolvedValueOnce([
        [null, 1],
        [null, mockAnswers],
      ]);

      const result = await service.closeQna(qnaId);

      expect(result).toHaveLength(1);
      expect(service.updatePartial).toHaveBeenCalled();
    });

    it('실패: 파이프라인 실행 중 에러가 발생하면 예외를 던져야 한다', async () => {
      pipeline.exec.mockResolvedValueOnce([[new Error('Redis Fail'), null]]);

      await expect(service.closeQna(qnaId)).rejects.toThrow('Close failed');
    });

    it('실패: 존재하지 않는 질문 ID인 경우 에러를 던져야 한다', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.closeQna(qnaId)).rejects.toThrow('Qna not found');
    });
  });

  describe('getFinalResults', () => {
    it('종료된 질문의 경우 저장된 답변 배열을 반환해야 한다', async () => {
      const mockAnswers = [{ participantId: 'u1', text: 'test' }];
      jest.spyOn(service, 'findOne').mockResolvedValue({
        status: 'ended',
        answers: mockAnswers,
      } as any);

      const result = await service.getFinalResults('q1');
      expect(result).toEqual(mockAnswers);
    });

    it('진행 중이거나 답변이 없는 경우 빈 배열을 반환해야 한다', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ status: 'active' } as any);

      const result = await service.getFinalResults('q1');
      expect(result).toEqual([]);
    });
  });

  describe('handleQnaAutoClose', () => {
    const expiredKey = 'qna:qna-123:active';
    let findOneSpy: jest.SpyInstance;
    let closeQnaSpy: jest.SpyInstance;

    beforeEach(() => {
      (service as any).eventEmitter = { emit: jest.fn() };

      findOneSpy = jest.spyOn(service, 'findOne');
      closeQnaSpy = jest.spyOn(service, 'closeQna').mockResolvedValue([]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('성공: active 키 만료 시 이벤트를 발행해야 한다', async () => {
      const mockQna = { id: 'qna-123', status: 'active', isPublic: true };
      findOneSpy.mockResolvedValue(mockQna as any);

      await service.handleQnaAutoClose(expiredKey);

      expect(closeQnaSpy).toHaveBeenCalledWith('qna-123');
      expect((service as any).eventEmitter.emit).toHaveBeenCalledWith(
        'qna.autoClosed',
        expect.objectContaining({ qnaId: 'qna-123' }),
      );
    });

    it('무시: 만료된 키가 active가 아닌 경우 아무 작업도 하지 않아야 한다', async () => {
      await service.handleQnaAutoClose('qna:qna-123:other');

      // 이제 findOneSpy는 Mock 함수이므로 정상적으로 체크 가능합니다.
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it('무시: 이미 종료된 질문인 경우 closeQna를 호출하지 않아야 한다', async () => {
      findOneSpy.mockResolvedValue({ status: 'ended' } as any);

      await service.handleQnaAutoClose(expiredKey);

      expect(closeQnaSpy).not.toHaveBeenCalled();
    });

    it('에러 처리: closeQna 실패 시 로그를 남겨야 한다', async () => {
      findOneSpy.mockResolvedValue({ id: 'q1', status: 'active' } as any);
      closeQnaSpy.mockRejectedValue(new Error('Close Fail'));

      // logger 역시 spyOn으로 래핑
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await service.handleQnaAutoClose(expiredKey);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[AutoClose Error]'));
    });
  });
});
