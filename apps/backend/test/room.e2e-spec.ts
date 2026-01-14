import { Test, TestingModule } from '@nestjs/testing';
import { Global, INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { RoomService } from '../src/room/room.service.js';
import { RedisModule } from '../src/redis/redis.module.js';
import { RedisService } from '../src/redis/redis.service.js';
import * as Managers from '../src/redis/repository-manager/index.js';

const mockRedisService = {};
const mockManagers = {
  RoomManagerService: { saveOne: jest.fn(), addParticipant: jest.fn() },
  ParticipantManagerService: {},
  PollManagerService: {},
  QnaManagerService: {},
};

describe('RoomController (E2E) - 데코레이터 및 유효성 검사', () => {
  let app: INestApplication;

  // 실제 S3를 쏘지 않도록 서비스만 Mocking
  const mockRoomService = {
    createRoom: jest.fn().mockResolvedValue({ id: 'success-id' }),
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

  afterAll(async () => {
    await app.close();
  });
});
