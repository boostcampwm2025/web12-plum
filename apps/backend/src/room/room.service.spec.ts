import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateRoomRequest, EnterLectureRequestBody, Room } from '@plum/shared-interfaces';

import { RoomService } from './room.service.js';
import { InteractionService } from '../interaction/interaction.service.js';
import {
  ActivityScoreManagerService,
  ParticipantManagerService,
  RoomManagerService,
} from '../redis/repository-manager/index.js'; // 경로 수정
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

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test data'),
    mimetype: 'application/pdf',
    size: 1024,
  } as Express.Multer.File;

  const mockCreateRoomDto: CreateRoomRequest = {
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
            isNameAvailable: jest.fn(),
            getParticipantsInRoom: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ActivityScoreManagerService,
          useValue: {
            initializeParticipantScore: jest.fn(),
          },
        },
        {
          provide: ParticipantManagerService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MediasoupService,
          useValue: {
            createRouter: jest.fn().mockResolvedValue({
              rtpCapabilities: { codecs: [{ mimeType: 'audio/opus' }] },
            }),
            createRoutersWithStrategy: jest.fn().mockResolvedValue(undefined),
            getRouterRtpCapabilities: jest.fn().mockReturnValue({
              codecs: [{ mimeType: 'audio/opus' }],
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
            expect.objectContaining({
              url: expect.stringContaining(`https://test-bucket.s3.ap-northeast-2.amazonaws.com/`),
              size: expect.any(Number),
            }),
          ],
        }),
      );

      expect(mediasoupService.createRoutersWithStrategy).toHaveBeenCalledWith(
        result.roomId,
        'LECTURE',
      );

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

    it('여러 개의 파일을 업로드할 때 모든 URL이 순서대로 저장되어야 한다', async () => {
      const mockFiles = [
        { originalname: 'file1.png', buffer: Buffer.from('1'), mimetype: 'image/png', size: 500 },
        {
          originalname: 'file2.pdf',
          buffer: Buffer.from('2'),
          mimetype: 'application/pdf',
          size: 1200,
        },
      ] as Express.Multer.File[];

      const result = await service.createRoom(mockCreateRoomDto, mockFiles);

      if (!('roomId' in result)) fail('Response should contain roomId');

      expect(result.roomId).toBeDefined();
      const savedRoom = (roomManagerService.saveOne as jest.Mock).mock.calls[0][1];
      expect(savedRoom.files).toHaveLength(2);
      expect(savedRoom.files[0]).toMatchObject({
        url: expect.stringContaining(`file1.png`),
        size: 500,
      });
      expect(savedRoom.files[1]).toMatchObject({
        url: expect.stringContaining(`file2.pdf`),
        size: 1200,
      });
    });

    it('Mediasoup 라우터 생성 실패 시 예외를 던져야 한다', async () => {
      jest
        .spyOn(mediasoupService, 'createRoutersWithStrategy')
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
      expect(result).toBe(mockRoom);
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

  describe('validateNickname', () => {
    const mockRoomId = '01HJZ92956N9Y68SS7B9D95H01';

    it('RoomManagerService의 중복 체크 결과를 반환해야 한다', async () => {
      // RoomManagerService.isNameAvailable이 true를 반환하도록 모킹
      jest.spyOn(roomManagerService, 'isNameAvailable').mockResolvedValue(true);

      const result = await service.validateNickname(mockRoomId, '유저1');

      expect(roomManagerService.isNameAvailable).toHaveBeenCalledWith(mockRoomId, '유저1');
      expect(result).toBe(true);
    });

    it('중복된 경우 false를 반환해야 한다', async () => {
      jest.spyOn(roomManagerService, 'isNameAvailable').mockResolvedValue(false);

      const result = await service.validateNickname(mockRoomId, '중복유저');

      expect(result).toBe(false);
    });
  });

  describe('joinRoom', () => {
    const mockRoomId = 'test-room-id';
    const mockJoinDto: EnterLectureRequestBody = {
      name: '테스트 강의실',
      nickname: '신규참가자',
      isAgreed: true,
      isAudioOn: true,
      isVideoOn: true,
    };

    beforeEach(() => {
      // 기본 방 검증 통과 설정
      jest.spyOn(service, 'validateRoom').mockResolvedValue({
        id: mockRoomId,
        name: '테스트 강의실',
        status: 'active',
      } as any);

      // Mediasoup RTP Capabilities 모킹
      jest.spyOn(mediasoupService, 'getRouterRtpCapabilities').mockReturnValue({
        codecs: [{ mimeType: 'video/vp8' }],
      } as any);
    });

    it('방 이름이 일치하지 않으면 BadRequestException을 던져야 한다', async () => {
      const wrongDto = { ...mockJoinDto, name: '틀린 이름' };
      await expect(service.joinRoom(mockRoomId, wrongDto)).rejects.toThrow(BadRequestException);
    });

    it('입장 시 본인을 제외한 발표자 정보와 선착순 청중 비디오, 모든 오디오를 반환해야 한다', async () => {
      // 1. 가짜 참가자 데이터 생성 (발표자 1, 청중 6)
      const mockParticipants = [
        {
          id: 'host-id',
          role: 'presenter',
          producers: { audio: 'a-h', video: 'v-h', screen: 's-h' },
        },
        {
          id: 'early-1',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:01Z',
          producers: { audio: 'a-1', video: 'v-1' },
        },
        {
          id: 'early-2',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:02Z',
          producers: { audio: 'a-2', video: 'v-2' },
        },
        {
          id: 'early-3',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:03Z',
          producers: { audio: 'a-3', video: 'v-3' },
        },
        {
          id: 'early-4',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:04Z',
          producers: { audio: 'a-4', video: 'v-4' },
        },
        {
          id: 'late-5',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:05Z',
          producers: { audio: 'a-5', video: 'v-5' },
        },
        {
          id: 'newbie-id',
          role: 'audience',
          joinedAt: '2024-01-01T00:00:06Z',
          producers: { audio: 'a-6' },
        },
      ];

      // 서비스 내부 함수들 모킹
      jest.spyOn(service, 'createParticipant').mockResolvedValue({
        id: 'newbie-id',
        name: '신규참가자',
        role: 'audience',
      } as any);

      jest
        .spyOn(roomManagerService, 'getParticipantsInRoom')
        .mockResolvedValue(mockParticipants as any);

      const result = await service.joinRoom(mockRoomId, mockJoinDto);

      if (!('mediasoup' in result)) fail('Response should contain mediasoup');

      // 2. 검증: existingProducers 구성 확인
      const producers = result.mediasoup.existingProducers;

      // [발표자 검증] 비디오, 오디오, 화면공유 모두 포함되어야 함
      expect(producers).toContainEqual({
        producerId: 'a-h',
        participantId: 'host-id',
        kind: 'audio',
        type: 'audio',
      });
      expect(producers).toContainEqual({
        producerId: 'v-h',
        participantId: 'host-id',
        kind: 'video',
        type: 'video',
      });
      expect(producers).toContainEqual({
        producerId: 's-h',
        participantId: 'host-id',
        kind: 'video',
        type: 'screen',
      });

      expect(producers.filter((p) => p.kind === 'audio')).toHaveLength(6);
      expect(producers).toContainEqual({
        producerId: 'a-5',
        participantId: 'late-5',
        kind: 'audio',
        type: 'audio',
      });
      expect(producers).toHaveLength(13);
    });

    it('본인이 발표자인 경우 본인 정보는 existingProducers에서 제외되어야 한다', async () => {
      const mockHost = { id: 'host-id', role: 'presenter', producers: { audio: 'a-h' } };
      const mockAudience = { id: 'p1', role: 'audience', producers: { audio: 'a-1' } };

      jest.spyOn(service, 'createParticipant').mockResolvedValue(mockHost as any);
      jest
        .spyOn(roomManagerService, 'getParticipantsInRoom')
        .mockResolvedValue([mockHost, mockAudience] as any);

      const result = await service.joinRoom(mockRoomId, mockJoinDto);

      if (!('mediasoup' in result)) fail('Response should contain mediasoup');

      // 본인(host-id)의 프로듀서는 목록에 없어야 함
      const hasSelf = result.mediasoup.existingProducers.some((p) => p.participantId === 'host-id');
      expect(hasSelf).toBe(false);
      expect(result.mediasoup.existingProducers).toHaveLength(1); // p1의 오디오만 남음
    });
  });

  describe('getFiles', () => {
    const mockRoomId = 'test-room-id';

    it('방이 존재하면 파일 리스트를 반환해야 한다', async () => {
      const mockFiles = [
        { url: 'url1.pdf', size: 14123 },
        { url: 'url2.png', size: 13213 },
      ];
      const mockRoom: Partial<Room> = { id: mockRoomId, files: mockFiles };

      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(mockRoom as Room);

      const result = await service.getFiles(mockRoomId);

      expect(roomManagerService.findOne).toHaveBeenCalledWith(mockRoomId);
      expect(result).toEqual(mockFiles);
      expect(result).toHaveLength(2);
    });

    it('방이 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(null);

      await expect(service.getFiles(mockRoomId)).rejects.toThrow(
        new NotFoundException(`Room with ID ${mockRoomId} not found`),
      );
    });

    it('방은 존재하지만 파일 배열이 비어있는 경우 빈 배열을 반환해야 한다', async () => {
      const mockRoom: Partial<Room> = { id: mockRoomId, files: [] };
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(mockRoom as Room);

      const result = await service.getFiles(mockRoomId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
