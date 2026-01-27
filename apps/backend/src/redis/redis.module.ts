import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import * as Managers from './repository-manager/index.js';

const managers = [
  Managers.RoomManagerService,
  Managers.ParticipantManagerService,
  Managers.PollManagerService,
  Managers.QnaManagerService,
  Managers.ActivityScoreManagerService,
];
@Global()
@Module({
  providers: [RedisService, ...managers],
  exports: [RedisService, ...managers],
})
export class RedisModule {}
