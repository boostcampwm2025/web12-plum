import { Module } from '@nestjs/common';
import { InteractionGateway } from './interaction.gateway.js';
import { InteractionService } from './interaction.service.js';
import { InteractionRepository, MockInteractionRepository } from './interaction.repository.js';

@Module({
  providers: [
    InteractionService,
    InteractionGateway,
    {
      provide: InteractionRepository,
      useClass: MockInteractionRepository,
    },
  ],
  exports: [InteractionService],
})
export class InteractionModule {}
