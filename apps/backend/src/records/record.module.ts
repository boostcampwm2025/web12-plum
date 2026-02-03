import { Module } from '@nestjs/common';
import { RecordService } from './record.service.js';
import { FileWatcherService } from './file-watcher.service.js';

@Module({
  providers: [RecordService, FileWatcherService],
  exports: [RecordService, FileWatcherService],
})
export class RecordModule {}
