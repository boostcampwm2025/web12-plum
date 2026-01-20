import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateRoomRequest,
  EnterLectureRequestBody,
  EnterRoomResponse,
} from '@plum/shared-interfaces';

import { RoomController } from './room.controller';
import { RoomService } from './room.service';

describe('RoomController', () => {
  let controller: RoomController;
  let service: RoomService;

  // RoomService Mocking
  const mockRoomService = {
    createRoom: jest.fn(),
    validateRoom: jest.fn(),
    getRoomValidation: jest.fn(),
    validateNickname: jest.fn(),
    joinRoom: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: mockRoomService,
        },
      ],
    }).compile();

    controller = module.get<RoomController>(RoomController);
    service = module.get<RoomService>(RoomService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost', () => {
    const mockDto: CreateRoomRequest = {
      name: 'NestJS 강의실',
      hostName: '김코딩',
      isAgreed: true,
      polls: [],
      qnas: [],
    };

    const mockFiles = [
      {
        fieldname: 'presentationFiles',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test file content'),
        size: 1024,
      },
    ] as Express.Multer.File[];

    it('성공적으로 강의실 생성을 요청하면 RoomService의 createRoom을 호출해야 한다', async () => {
      // service.createRoom이 반환할 가짜 결과값
      const expectedResult = { roomId: 'room-id' };
      mockRoomService.createRoom.mockResolvedValue(expectedResult);

      const result = await controller.createPost(mockDto, mockFiles);

      // 서비스 함수가 올바른 인자와 함께 호출되었는지 검증
      expect(service.createRoom).toHaveBeenCalledWith(mockDto, mockFiles);
      expect(result).toEqual(expectedResult);
    });

    it('파일이 없어도(빈 배열) 요청이 정상적으로 처리되어야 한다', async () => {
      const emptyFiles: Express.Multer.File[] = [];
      mockRoomService.createRoom.mockResolvedValue({ status: 'success' });

      await controller.createPost(mockDto, emptyFiles);

      expect(service.createRoom).toHaveBeenCalledWith(mockDto, emptyFiles);
    });

    it('투표와 질문이 포함된 정상 데이터를 전송한 경우', async () => {
      const fullDto: CreateRoomRequest = {
        name: '유효한 강의실 이름',
        hostName: '정상호스트',
        isAgreed: true,
        polls: [{ title: '투표1', options: [{ value: 'ㅇㅇ' }, { value: 'ㄴㄴ' }], timeLimit: 60 }],
        qnas: [{ title: '질문1', timeLimit: 60, isPublic: true }],
      };

      mockRoomService.createRoom.mockResolvedValue({ roomId: 'new-room-id' });

      const result = await controller.createPost(fullDto, mockFiles);

      if (!('roomId' in result)) fail('Response should contain roomId');
      expect(service.createRoom).toHaveBeenCalledWith(fullDto, mockFiles);
      expect(result.roomId).toBe('new-room-id');
    });

    it('파일 업로드 중 서버 에러(S3 에러 등)가 발생한 경우', async () => {
      const dto: CreateRoomRequest = {
        name: '에러테스트',
        hostName: '호스트',
        isAgreed: true,
        polls: [],
        qnas: [],
      };

      mockRoomService.createRoom.mockRejectedValue(
        new InternalServerErrorException('파일 업로드 중 오류가 발생했습니다.'),
      );

      await expect(controller.createPost(dto, mockFiles)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('validateRoom', () => {
    const mockUlid = '01HJZ92956N9Y68SS7B9D95H01'; // 유효한 ULID 예시

    it('방이 유효하면 아무것도 반환하지 않고 204를 기대한다', async () => {
      mockRoomService.getRoomValidation.mockResolvedValue(undefined);

      const result = await controller.validateRoom(mockUlid);

      expect(service.getRoomValidation).toHaveBeenCalledWith(mockUlid);
      expect(result).toBeUndefined();
    });

    it('방이 종료된 상태면 BadRequestException을 던져야 한다', async () => {
      mockRoomService.getRoomValidation.mockRejectedValue(
        new BadRequestException('The room has already ended.'),
      );
      await expect(controller.validateRoom(mockUlid)).rejects.toThrow(BadRequestException);
    });

    it('방이 유효하지 않으면 NotFoundException을 던져야 한다', async () => {
      const error = new NotFoundException(`Room with ID ${mockUlid} not found`);
      mockRoomService.getRoomValidation.mockRejectedValue(error);

      await expect(controller.validateRoom(mockUlid)).rejects.toThrow(NotFoundException);
      expect(service.getRoomValidation).toHaveBeenCalledWith(mockUlid);
    });
  });

  describe('validateNickname', () => {
    const mockUlid = '01HJZ92956N9Y68SS7B9D95H01';
    const mockNickname = 'testUser';
    const mockQuery = { nickname: mockNickname };

    it('닉네임이 사용 가능하면 { available: true }를 반환해야 한다', async () => {
      mockRoomService.validateNickname.mockResolvedValue(true);

      const result = await controller.validateNickname(mockUlid, mockQuery);

      expect(service.validateNickname).toHaveBeenCalledWith(mockUlid, mockNickname);
      expect(result).toEqual({ available: true });
    });

    it('닉네임이 중복되면 { available: false }를 반환해야 한다', async () => {
      mockRoomService.validateNickname.mockResolvedValue(false);

      const result = await controller.validateNickname(mockUlid, mockQuery);

      expect(service.validateNickname).toHaveBeenCalledWith(mockUlid, mockNickname);
      expect(result).toEqual({ available: false });
    });

    it('서비스에서 예외가 발생하면 예외를 그대로 던져야 한다', async () => {
      mockRoomService.validateNickname.mockRejectedValue(
        new BadRequestException('Invalid nickname format'),
      );

      await expect(controller.validateNickname(mockUlid, mockQuery)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('joinRoom', () => {
    const mockRoomId = '01HJZ92956N9Y68SS7B9D95H01';
    const mockJoinDto = {
      name: 'NestJS 강의실',
      nickname: '테스터',
    } as EnterLectureRequestBody;

    it('성공적으로 입장을 요청하면 RoomService의 joinRoom을 호출하고 결과를 반환해야 한다', async () => {
      // 1. 서비스 응답 모킹 (우리가 설계한 구조)
      const expectedResponse: EnterRoomResponse = {
        participantId: 'participant-ulid',
        name: '테스터',
        role: 'audience',
        mediasoup: {
          routerRtpCapabilities: { codecs: [] } as any,
          existingProducers: [
            { producerId: 'p1', participantId: 'user1', kind: 'audio', type: 'audio' },
            { producerId: 'v1', participantId: 'user1', kind: 'video', type: 'video' },
          ],
        },
      };

      mockRoomService.joinRoom = jest.fn().mockResolvedValue(expectedResponse);

      const result = await controller.joinRoom(mockRoomId, mockJoinDto);

      expect(service.joinRoom).toHaveBeenCalledWith(mockRoomId, mockJoinDto);
      expect(result).toEqual(expectedResponse);
    });

    it('방 이름이 틀려 서비스에서 BadRequestException이 발생하면 이를 그대로 던져야 한다', async () => {
      mockRoomService.joinRoom = jest
        .fn()
        .mockRejectedValue(new BadRequestException('Room name does not match'));

      await expect(controller.joinRoom(mockRoomId, mockJoinDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 방 ID인 경우 NotFoundException을 던져야 한다', async () => {
      mockRoomService.joinRoom = jest
        .fn()
        .mockRejectedValue(new NotFoundException(`Room with ID ${mockRoomId} not found`));

      await expect(controller.joinRoom(mockRoomId, mockJoinDto)).rejects.toThrow(NotFoundException);
    });
  });
});
