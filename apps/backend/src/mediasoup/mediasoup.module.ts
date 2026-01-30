import { Module, Global } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service.js';
import { MultiRouterManagerService } from './multi-router-manager.service.js';
import { PrometheusModule } from '../prometheus/prometheus.module.js';

/**
 * Mediasoup 모듈
 *
 * @Global 데코레이터로 전역 모듈 설정
 */
@Global()
@Module({
  imports: [PrometheusModule],
  providers: [MediasoupService, MultiRouterManagerService],
  exports: [MediasoupService, MultiRouterManagerService],
})
export class MediasoupModule {}
