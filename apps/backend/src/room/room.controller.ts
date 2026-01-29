import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_FILE_MIME_TYPES,
  CreateRoomRequest,
  CreateRoomResponse,
  EnterLectureRequestBody,
  enterLectureSchema,
  EnterRoomResponse,
  FILE_MAX_SIZE_BYTES,
  nicknameValidate,
  NicknameValidationRequestQueryParam,
  NicknameValidationResponse,
  RoomSummary,
  RoomValidationResponse,
} from '@plum/shared-interfaces';

import { RoomService } from './room.service.js';
import { CreateRoomValidationPipe } from './create-room-validation.pipe.js';
import { UlidValidationPipe, ZodValidationPipe } from '../common/pipes/index.js';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('presentationFiles', 5, {
      limits: {
        fileSize: FILE_MAX_SIZE_BYTES,
      },
      fileFilter: (req, file, callback) => {
        if ((ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException(`허용되지 않는 파일 형식입니다.`), false);
        }
      },
    }),
  )
  async createPost(
    @Body(new CreateRoomValidationPipe()) body: CreateRoomRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<CreateRoomResponse> {
    return await this.roomService.createRoom(body, files);
  }

  @Get(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validateRoom(@Param('id', UlidValidationPipe) id: string): Promise<RoomValidationResponse> {
    return await this.roomService.getRoomValidation(id);
  }

  @Get(':id/nickname/validate')
  @HttpCode(HttpStatus.OK)
  async validateNickname(
    @Param('id', UlidValidationPipe) id: string,
    @Query(new ZodValidationPipe(nicknameValidate)) query: NicknameValidationRequestQueryParam,
  ): Promise<NicknameValidationResponse> {
    const available = await this.roomService.validateNickname(id, query.nickname);
    return { available };
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @Param('id', UlidValidationPipe) id: string,
    @Body(new ZodValidationPipe(enterLectureSchema)) body: EnterLectureRequestBody,
  ): Promise<EnterRoomResponse> {
    return await this.roomService.joinRoom(id, body);
  }

  @Get(':id/summary')
  @HttpCode(HttpStatus.OK)
  async getSummary(@Param('id', UlidValidationPipe) id: string): Promise<RoomSummary> {
    return await this.roomService.getSummary(id);
  }
}
