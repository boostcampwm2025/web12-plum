import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway.js';

@Module({
  providers: [RoomGateway],
})
export class RoomModule {}
