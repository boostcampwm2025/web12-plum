import { Module } from '@nestjs/common';
import { InteractionGateway } from './interaction.gateway.js';

@Module({
  providers: [InteractionGateway],
})
export class InteractionModule {}
