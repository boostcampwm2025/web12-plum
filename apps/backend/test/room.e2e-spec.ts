import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Global,
  INestApplication,
  Module,
  NotFoundException,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { RoomService } from '../src/room/room.service.js';
import { RedisModule } from '../src/redis/redis.module.js';
import { RedisService } from '../src/redis/redis.service.js';
import * as Managers from '../src/redis/repository-manager/index.js';

const mockRedisService = {};
const mockManagers = {
  RoomManagerService: {
    saveOne: jest.fn(),
    addParticipant: jest.fn(),
    findOne: jest.fn(),
  },
  ParticipantManagerService: {},
  PollManagerService: {},
  QnaManagerService: {},
};

describe('RoomController (E2E) - 데코레이터 및 유효성 검사', () => {
  let app: INestApplication;

  // 실제 S3를 쏘지 않도록 서비스만 Mocking
  const mockRoomService = {
    createRoom: jest.fn().mockResolvedValue({ id: 'success-id' }),
    validateRoom: jest.fn(),
  };

  beforeAll(async () => {
    @Global()
    @Module({
      providers: [
        { provide: RedisService, useValue: mockRedisService },
        { provide: Managers.RoomManagerService, useValue: mockManagers.RoomManagerService },
        {
          provide: Managers.ParticipantManagerService,
          useValue: mockManagers.ParticipantManagerService,
        },
        { provide: Managers.PollManagerService, useValue: mockManagers.PollManagerService },
        { provide: Managers.QnaManagerService, useValue: mockManagers.QnaManagerService },
      ],
      exports: [RedisService, ...Object.values(Managers)],
    })
    class FakeRedisModule {}

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(RedisModule)
      .useModule(FakeRedisModule)
      .overrideProvider(RoomService)
      .useValue(mockRoomService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('POST /room', () => {
    it('강의실 이름이 5자 미만일 때 (Zod/ValidationPipe 검증)', async () => {
      const invalidData = {
        name: '숏',
        hostName: '정상호스트',
        isAgreed: true,
      };

      const response = await request(app.getHttpServer()).post('/room').send(invalidData);

      expect(response.status).toBe(400);
      expect(mockRoomService.createRoom).not.toHaveBeenCalled();
    });

    it('허용되지 않은 파일 형식 전송 시 (FilesInterceptor 필터링)', async () => {
      const validData = {
        name: '정상적인 강의실 이름',
        hostName: '호스트',
        isAgreed: true,
      };

      const response = await request(app.getHttpServer())
        .post('/room')
        .field('name', validData.name)
        .field('hostName', validData.hostName)
        .field('isAgreed', 'true')
        .attach('presentationFiles', Buffer.from('fake-binary'), 'malware.exe'); // 허용 안 된 확장자

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('허용되지 않는 파일 형식');
      expect(mockRoomService.createRoom).not.toHaveBeenCalled();
    });

    it('모든 조건이 맞을 때 서비스 호출', async () => {
      const response = await request(app.getHttpServer())
        .post('/room')
        .field('name', '정상적인 강의실 이름')
        .field('hostName', '호스트')
        .field('isAgreed', true)
        .field('polls', JSON.stringify([]))
        .field('qnas', JSON.stringify([]))
        .attach('presentationFiles', Buffer.from('pdf data'), 'lecture.pdf');

      expect(response.status).toBe(201); // Created
      expect(mockRoomService.createRoom).toHaveBeenCalled();
    });
  });

  describe('GET /room/:id/validate', () => {
    const validUlid = '01HJZ92956N9Y68SS7B9D95H01';
    const invalidUlid = 'short-id';

    it('유효한 ULID이고 방이 존재하면 204 No Content를 반환해야 한다', async () => {
      // Service가 에러 없이 처리됨을 모킹
      mockRoomService.validateRoom.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).get(`/room/${validUlid}/validate`);

      expect(response.status).toBe(204);
      expect(mockRoomService.validateRoom).toHaveBeenCalledWith(validUlid);
    });

    it('ULID 형식이 잘못되면 400 Bad Request를 반환해야 한다', async () => {
      // 이 경우 서비스까지 도달하지 않음
      const response = await request(app.getHttpServer()).get(`/room/${invalidUlid}/validate`);

      expect(response.status).toBe(400);
    });

    it('방이 존재하지 않으면 서비스에서 던진 404를 반환해야 한다', async () => {
      // 서비스에서 에러 발생 시뮬레이션
      const errorMsg = `Room with ID ${validUlid} not found`;
      mockRoomService.validateRoom.mockRejectedValue(new NotFoundException(errorMsg));

      const response = await request(app.getHttpServer()).get(`/room/${validUlid}/validate`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(errorMsg);
    });

    it('실패 시: 방이 이미 종료되었으면 서비스에서 던진 400을 반환해야 한다', async () => {
      const errorMsg = 'The room has already ended.';
      mockRoomService.validateRoom.mockRejectedValue(new BadRequestException(errorMsg));

      const response = await request(app.getHttpServer()).get(`/room/${validUlid}/validate`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(errorMsg);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
