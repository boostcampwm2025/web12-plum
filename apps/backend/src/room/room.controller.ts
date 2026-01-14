import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_FILE_MIME_TYPES,
  createLectureSchema,
  CreateRoomResponse,
  FILE_MAX_SIZE_BYTES,
} from '@plum/shared-interfaces';

import { RoomService } from './room.service.js';
import { CreateRoomDto } from './room.dto.js';
import { CreateRoomValidationPipe } from './create-room-validation.pipe';

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
}
