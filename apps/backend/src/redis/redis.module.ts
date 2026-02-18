import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { HeartbeatService } from './heartbeat.service.js';
import * as Managers from './repository-manager/index.js';

const managers = [
  Managers.RoomManagerService,
  Managers.ParticipantManagerService,
  Managers.PollManagerService,
  Managers.QnaManagerService,
  Managers.ChatManagerService,
  Managers.ActivityScoreManagerService,
  Managers.RecordingManagerService,
  Managers.AiSummaryManagerService,
];
@Global()
@Module({
  providers: [RedisService, HeartbeatService, ...managers],
  exports: [RedisService, ...managers],
})
export class RedisModule {}
