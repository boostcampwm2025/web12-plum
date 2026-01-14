import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import { RoomService } from './room.service.js';
import { InteractionService } from '../interaction/interaction.service.js';
import { RoomManagerService } from '../redis/repository-manager/room-manager.service';

// S3 업로드 모킹
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({ Location: 'mock-url' }),
  })),
}));

describe('RoomService', () => {
  let service: RoomService;
  let roomManagerService: RoomManagerService;

  const MockedUpload = Upload as jest.MockedClass<typeof Upload>;

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test data'),
    mimetype: 'application/pdf',
  } as Express.Multer.File;

  const mockCreateRoomDto = {
    name: '테스트 강의실',
    hostName: '호스트',
    isAgreed: true,
    polls: [],
    qnas: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AWS_S3_REGION: 'ap-northeast-2',
                AWS_S3_BUCKET_NAME: 'test-bucket',
                AWS_S3_ACCESS_KEY: 'test-key',
                AWS_S3_SECRET_KEY: 'test-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: InteractionService,
          useValue: {
            createMultiplePoll: jest.fn().mockResolvedValue([]),
            createMultipleQna: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RoomManagerService,
          useValue: {
            saveOne: jest.fn().mockResolvedValue(undefined),
            addParticipant: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    roomManagerService = module.get<RoomManagerService>(RoomManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('강의실 생성 시 파일 업로드, 인터랙션 생성, 방/호스트 저장이 순차적으로 일어나야 한다', async () => {
      const result = await service.createRoom(mockCreateRoomDto, [mockFile]);

      // 1. 반환값 검증
      expect(result).toHaveProperty('roomId');

      // 2. S3 업로드 URL이 제대로 형성되었는지 확인 (saveOne 호출 인자 검증)
      expect(roomManagerService.saveOne).toHaveBeenCalledWith(
        result.roomId,
        expect.objectContaining({
          name: mockCreateRoomDto.name,
          files: [expect.stringContaining('test-bucket.s3.ap-northeast-2.amazonaws.com')],
        }),
        -1,
      );

      // 3. 호스트 생성 확인 (addParticipant)
      expect(roomManagerService.addParticipant).toHaveBeenCalledWith(
        result.roomId,
        expect.objectContaining({
          name: mockCreateRoomDto.hostName,
          role: 'presenter',
        }),
      );
    });

    it('파일 업로드 중 오류가 발생하면 예외를 던져야 한다', async () => {
      MockedUpload.mockImplementationOnce(
        () =>
          ({
            done: jest.fn().mockRejectedValue(new Error('S3 Upload Error')),
          }) as any,
      );

      await expect(service.createRoom(mockCreateRoomDto, [mockFile])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createParticipant', () => {
    it('참가자를 생성하고 addParticipant를 통해 저장해야 한다', async () => {
      const roomId = 'room-ulid';
      const participantName = '학생1';

      const result = await service.createParticipant(roomId, participantName);

      expect(result.name).toBe(participantName);
      expect(result.role).toBe('audience');
      expect(roomManagerService.addParticipant).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({ id: result.id, name: participantName }),
      );
    });
  });
});
