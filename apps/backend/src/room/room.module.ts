import { Module } from '@nestjs/common';
import { RoomController } from './room.controller.js';
import { RoomGateway } from './room.gateway.js';
import { RoomService } from './room.service.js';
import { InteractionModule } from '../interaction/interaction.module.js';
import { PrometheusModule } from '../prometheus/prometheus.module.js';

@Module({
  imports: [InteractionModule, PrometheusModule],
  providers: [RoomService, RoomGateway],
  controllers: [RoomController],
})
export class RoomModule {}
