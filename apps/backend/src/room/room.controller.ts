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
  createLectureSchema,
  CreateRoomResponse,
  FILE_MAX_SIZE_BYTES,
  nicknameValidate,
  NicknameValidationRequestQueryParam,
  NicknameValidationResponse,
} from '@plum/shared-interfaces';

import { RoomService } from './room.service.js';
import { CreateRoomDto } from './room.dto.js';
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
    @Body(new CreateRoomValidationPipe(createLectureSchema)) body: CreateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<CreateRoomResponse> {
    return await this.roomService.createRoom(body, files);
  }

  @Get(':id/validate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async validateRoom(@Param('id', UlidValidationPipe) id: string): Promise<void> {
    await this.roomService.validateRoom(id);
  }

  @Get(':id/nickname/validate')
  @HttpCode(HttpStatus.OK)
  async validateNickname(
    @Query(new ZodValidationPipe(nicknameValidate)) query: NicknameValidationRequestQueryParam,
    @Param('id', UlidValidationPipe) id: string,
  ): Promise<NicknameValidationResponse> {
    const available = await this.roomService.validateNickname(id, query.nickname);
    return { available };
  }
}
