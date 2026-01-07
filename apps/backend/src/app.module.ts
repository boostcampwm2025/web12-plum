import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module.js';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/logger.config.js';
import { LoggingInterceptor } from './common/interceptors/index.js';

@Module({
  imports: [HealthModule, WinstonModule.forRoot(winstonConfig)],
  controllers: [],
  providers: [
    // 전역 HTTP 로깅 인터셉터
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
