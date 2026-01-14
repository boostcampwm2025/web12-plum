import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import { RoomService } from './room.service';
import { InteractionService } from '../interaction/interaction.service';
import { RoomRepository } from './room.repository';

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({ Location: 'mock-url' }),
  })),
}));

describe('RoomService', () => {
  let service: RoomService;
  let roomRepository: RoomRepository;

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
          provide: RoomRepository,
          useValue: {
            saveRoom: jest.fn().mockResolvedValue(true),
            saveParticipant: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    roomRepository = module.get<RoomRepository>(RoomRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('강의실 생성 및 파일 업로드가 성공해야 한다', async () => {
      const result = await service.createRoom(mockCreateRoomDto, [mockFile]);

      expect(result).toHaveProperty('roomId');

      expect(roomRepository.saveRoom).toHaveBeenCalledWith(
        expect.stringContaining('room:'),
        expect.objectContaining({
          name: mockCreateRoomDto.name,
          files: [expect.stringContaining('test-bucket.s3.ap-northeast-2.amazonaws.com')],
        }),
        -1,
      );

      expect(roomRepository.saveParticipant).toHaveBeenCalled();
    });

    it('파일 업로드 중 오류가 발생하면 InternalServerErrorException을 던져야 한다', async () => {
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
    it('새로운 참가자를 생성하고 저장해야 한다', async () => {
      const roomId = 'test-room-id';
      const result = await service.createParticipant(roomId, '참가자1', 'presenter');

      expect(result.name).toBe('참가자1');
      expect(result.roomId).toBe(roomId);
      expect(roomRepository.saveParticipant).toHaveBeenCalled();
    });
  });
});
