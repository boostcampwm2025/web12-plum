import { Module, Global } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service.js';
import { MultiRouterManagerService } from './multi-router-manager.service.js';
import { AudioLevelObserverService } from './audio-level-observer.service.js';
import { PrometheusModule } from '../prometheus/prometheus.module.js';

/**
 * Mediasoup 모듈
 *
 * @Global 데코레이터로 전역 모듈 설정
 */
@Global()
@Module({
  imports: [PrometheusModule],
  providers: [MediasoupService, MultiRouterManagerService, AudioLevelObserverService],
  exports: [MediasoupService, MultiRouterManagerService, AudioLevelObserverService],
})
export class MediasoupModule {}
