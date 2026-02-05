import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { RecordService } from './record.service.js';
import { FileWatcherService } from './file-watcher.service.js';
import { SummarizeModule } from '../summarize/summarize.module.js';

@Module({
  imports: [RedisModule, SummarizeModule],
  providers: [RecordService, FileWatcherService],
  exports: [RecordService, FileWatcherService],
})
export class RecordModule {}
