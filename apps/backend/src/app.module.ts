import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module.js';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/logger.config.js';
import { LoggingInterceptor } from './common/interceptors/index.js';
import { HttpExceptionFilter } from './common/filters/index.js';
import { MediaModule } from './media/media.module.js';
import { InteractionModule } from './interaction/interaction.module.js';
import { RoomModule } from './room/room.module.js';

@Module({
  imports: [
    HealthModule,
    WinstonModule.forRoot(winstonConfig),
    MediaModule,
    InteractionModule,
    RoomModule,
  ],
  controllers: [],
  providers: [
    // 전역 HTTP 로깅 인터셉터
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // 전역 예외 필터 (404 에러 등 로깅)
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
