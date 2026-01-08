import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CORS_CONFIG } from './common/constants/cors.constants.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // bufferLogs: true로 초기 로그를 버퍼에 저장
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.enableCors({
    ...CORS_CONFIG,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Winston 로거를 NestJS 기본 로거로 교체
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.listen(3000);

  // 부트스트랩 완료 로그 (이제 Winston이 처리)
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`Application is running on: http://localhost:3000`, 'Bootstrap');
}
bootstrap();
