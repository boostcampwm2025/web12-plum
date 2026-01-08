import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { MediaModule } from './media/media.module.js';
import { InteractionModule } from './interaction/interaction.module.js';
import { RoomModule } from './room/room.module.js';

@Module({
  imports: [HealthModule, MediaModule, InteractionModule, RoomModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
