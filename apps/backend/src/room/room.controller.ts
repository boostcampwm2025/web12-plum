import { Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/')
  @UseInterceptors(FilesInterceptor('presentationFiles', 5))
  async createPost(@UploadedFiles() files: Express.Multer.File[]): Promise<any> {}
}
