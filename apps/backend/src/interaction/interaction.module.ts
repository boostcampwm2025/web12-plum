import { Module } from '@nestjs/common';
import { InteractionGateway } from './interaction.gateway.js';
import { InteractionService } from './interaction.service.js';
import { PrometheusModule } from '../prometheus/prometheus.module.js';

@Module({
  imports: [PrometheusModule],
  providers: [InteractionService, InteractionGateway],
  exports: [InteractionService],
})
export class InteractionModule {}
