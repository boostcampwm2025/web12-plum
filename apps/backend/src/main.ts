import { NestFactory } from '@nestjs/core';
import { CORS_CONFIG } from './shared/constants/cors.constants.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    ...CORS_CONFIG,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.listen(3000);
}
bootstrap();
