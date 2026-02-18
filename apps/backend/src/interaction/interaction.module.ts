import { Module } from '@nestjs/common';
import { PrometheusModule } from '../prometheus/prometheus.module.js';
import * as Gateway from './gateway/index.js';
import * as Service from './service/index.js';

const gateways = [
  Gateway.PollGateway,
  Gateway.QnaGateway,
  Gateway.GestureGateway,
  Gateway.ActivityScoreGateway,
];

const services = [Service.PollService, Service.QnaService];

@Module({
  imports: [PrometheusModule],
  providers: [...services, ...gateways],
  exports: [...services],
})
export class InteractionModule {}
