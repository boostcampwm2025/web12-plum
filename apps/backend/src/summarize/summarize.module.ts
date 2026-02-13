import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { SummarizeService } from './summarize.service.js';

@Module({
  imports: [RedisModule],
  providers: [SummarizeService],
  exports: [SummarizeService],
})
export class SummarizeModule {}
