import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import { Room } from '@plum/shared-interfaces';

import { RoomService } from './room.service.js';
import { CreateRoomDto } from './room.dto.js';
import { InteractionService } from '../interaction/interaction.service.js';
import { RoomManagerService } from '../redis/repository-manager/index.js'; // 경로 수정
import { MediasoupService } from '../mediasoup/mediasoup.service.js';

// S3 업로드 모킹
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({ Location: 'mock-url' }),
  })),
}));

describe('RoomService', () => {
  let service: RoomService;
  let roomManagerService: RoomManagerService;
  let mediasoupService: MediasoupService;

  const MockedUpload = Upload as jest.MockedClass<typeof Upload>;

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test data'),
    mimetype: 'application/pdf',
  } as Express.Multer.File;

  const mockCreateRoomDto: CreateRoomDto = {
    name: '테스트 강의실',
    hostName: '호스트',
    isAgreed: true,
    polls: [{ title: 'poll 1', options: [{ value: '1' }, { value: '2' }], timeLimit: 60 }],
    qnas: [{ title: 'Q&A 1', isPublic: true, timeLimit: 60 }],
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
            createMultiplePoll: jest.fn().mockResolvedValue([{ id: 'poll-1' }]),
            createMultipleQna: jest.fn().mockResolvedValue([{ id: 'qna-1' }]),
          },
        },
        {
          provide: RoomManagerService,
          useValue: {
            saveOne: jest.fn().mockResolvedValue(undefined),
            addParticipant: jest.fn().mockResolvedValue(undefined),
            findOne: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MediasoupService,
          useValue: {
            createRouter: jest.fn().mockResolvedValue({
              rtpCapabilities: { codecs: [{ mimeType: 'audio/opus' }] },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    roomManagerService = module.get<RoomManagerService>(RoomManagerService);
    mediasoupService = module.get<MediasoupService>(MediasoupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('강의실 생성 시 파일 업로드, 인터랙션 생성, 방/호스트 저장이 정상적으로 수행되어야 한다', async () => {
      const result = await service.createRoom(mockCreateRoomDto, [mockFile]);

      expect(result).toMatchObject({
        roomId: expect.any(String),
        host: {
          id: expect.any(String),
          name: mockCreateRoomDto.hostName,
          role: 'presenter',
        },
        mediasoup: {
          routerRtpCapabilities: { codecs: expect.any(Array) },
        },
      });

      if (!('roomId' in result)) fail('Response should contain roomId');

      expect(roomManagerService.saveOne).toHaveBeenCalledWith(
        result.roomId,
        expect.objectContaining({
          files: [
            expect.stringContaining(`https://test-bucket.s3.ap-northeast-2.amazonaws.com/`) ||
              expect.stringContaining('test.pdf'),
          ],
          polls: ['poll-1'],
          qnas: ['qna-1'],
        }),
      );

      expect(mediasoupService.createRouter).toHaveBeenCalledWith(result.roomId);

      expect(roomManagerService.addParticipant).toHaveBeenCalledWith(
        result.roomId,
        expect.objectContaining({
          role: 'presenter',
          name: mockCreateRoomDto.hostName,
        }),
      );
    });

    it('파일이 없을 경우에도 방 생성이 정상적으로 수행되어야 한다', async () => {
      await service.createRoom(mockCreateRoomDto, []);

      expect(roomManagerService.saveOne).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ files: [] }),
      );
    });

    it('파일 업로드 중 오류가 발생하면 InternalServerErrorException을 던져야 한다', async () => {
      // Mock을 강제로 에러 발생 상태로 설정
      MockedUpload.mockImplementationOnce(
        () =>
          ({
            done: jest.fn().mockRejectedValue(new Error('S3 Error')),
          }) as any,
      );

      await expect(service.createRoom(mockCreateRoomDto, [mockFile])).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('여러 개의 파일을 업로드할 때 모든 URL이 순서대로 저장되어야 한다', async () => {
      const mockFiles = [
        { originalname: 'file1.png', buffer: Buffer.from('1'), mimetype: 'image/png' },
        { originalname: 'file2.pdf', buffer: Buffer.from('2'), mimetype: 'application/pdf' },
      ] as Express.Multer.File[];

      const result = await service.createRoom(mockCreateRoomDto, mockFiles);

      if (!('roomId' in result)) fail('Response should contain roomId');

      expect(result.roomId).toBeDefined();
      const savedRoom = (roomManagerService.saveOne as jest.Mock).mock.calls[0][1];
      expect(savedRoom.files).toHaveLength(2);
      expect(savedRoom.files[0]).toContain('file1.png');
      expect(savedRoom.files[1]).toContain('file2.pdf');
    });

    it('Mediasoup 라우터 생성 실패 시 예외를 던져야 한다', async () => {
      jest
        .spyOn(mediasoupService, 'createRouter')
        .mockRejectedValueOnce(new Error('Mediasoup Error'));

      await expect(service.createRoom(mockCreateRoomDto, [])).rejects.toThrow();
    });
  });

  describe('createParticipant', () => {
    it('참가자를 생성하고 Redis에 저장해야 한다', async () => {
      const roomId = 'test-room-id';
      const participantName = '테스터';

      const result = await service.createParticipant(roomId, participantName);

      expect(result).toMatchObject({
        roomId: roomId,
        name: participantName,
        role: 'audience',
      });
      expect(roomManagerService.addParticipant).toHaveBeenCalledWith(roomId, result);
    });

    it('매번 새로운 ULID가 생성되어야 한다', async () => {
      const roomId = 'room-123';
      const p1 = await service.createParticipant(roomId, '사용자1');
      const p2 = await service.createParticipant(roomId, '사용자2');

      // 두 참가자의 ID가 달라야 함
      expect(p1.id).not.toBe(p2.id);
      expect(p1.roomId).toBe(roomId);
      expect(p2.roomId).toBe(roomId);
    });
  });

  describe('validateRoom', () => {
    const mockRoomId = '01HJZ92956N9Y68SS7B9D95H01';

    it('방이 존재하고 상태가 "ended"가 아니면 true를 반환해야 한다', async () => {
      const mockRoom = { id: mockRoomId, status: 'active' } as Room;
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(mockRoom);

      const result = await service.validateRoom(mockRoomId);

      expect(roomManagerService.findOne).toHaveBeenCalledWith(mockRoomId);
      expect(result).toBe(true);
    });

    it('방이 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      await expect(service.validateRoom(mockRoomId)).rejects.toThrow(
        new NotFoundException(`Room with ID ${mockRoomId} not found`),
      );
    });

    it('방의 상태가 "ended"이면 BadRequestException을 던져야 한다', async () => {
      const mockRoom = { id: mockRoomId, status: 'ended' } as Room;
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(mockRoom);

      await expect(service.validateRoom(mockRoomId)).rejects.toThrow(
        new BadRequestException(`The room has already ended.`),
      );
    });
  });
});
