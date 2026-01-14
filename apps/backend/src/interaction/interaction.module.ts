import { Module } from '@nestjs/common';
import { InteractionGateway } from './interaction.gateway.js';
import { InteractionService } from './interaction.service.js';

@Module({
  providers: [InteractionService, InteractionGateway],
  exports: [InteractionService],
})
export class InteractionModule {}
