import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express';
import { RoomService } from './room.service.js';
import { CreateRoomDto } from './room.dto.js';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/')
  @UseInterceptors(FilesInterceptor('presentationFiles', 5))
  async createPost(
    @Body() body: CreateRoomDto,
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<any> {
    return await this.roomService.createRoom(body, files);
  }
}
