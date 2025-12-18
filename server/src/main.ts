import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { mediasoupConfig } from './config/mediasoup.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  });

  const port = mediasoupConfig.httpServer.port;
  await app.listen(port);

  logger.log(`Server listening on port ${port}`);
  logger.log('Ready for connections');
}
bootstrap();
