import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service.js';
import { PrometheusController } from './prometheus.controller.js';

@Module({
  providers: [PrometheusService],
  controllers: [PrometheusController],
  exports: [PrometheusService],
})
export class PrometheusModule {}
