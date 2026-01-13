import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { CreateRoomDto } from './room.dto';

describe('RoomController', () => {
  let controller: RoomController;
  let service: RoomService;

  // RoomService Mocking
  const mockRoomService = {
    createRoom: jest.fn(),
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
    const mockDto: CreateRoomDto = {
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
      const expectedResult = { id: 'room-id', ...mockDto, presentationFiles: ['https://s3...'] };
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
      const fullDto: CreateRoomDto = {
        name: '유효한 강의실 이름',
        hostName: '정상호스트',
        isAgreed: true,
        polls: [{ title: '투표1', options: [{ value: 'ㅇㅇ' }, { value: 'ㄴㄴ' }], timeLimit: 60 }],
        qnas: [{ title: '질문1', timeLimit: 60, isPublic: true }],
      };

      mockRoomService.createRoom.mockResolvedValue({ id: 'new-room-id', ...fullDto });

      const result = await controller.createPost(fullDto, mockFiles);

      expect(service.createRoom).toHaveBeenCalledWith(fullDto, mockFiles);
      expect(result.polls).toHaveLength(1);
      expect(result.id).toBe('new-room-id');
    });

    it('파일 업로드 중 서버 에러(S3 에러 등)가 발생한 경우', async () => {
      const dto: CreateRoomDto = {
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
});
