import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller('health')
export class HealthController {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  @Get()
  getHealth() {
    // 비즈니스 로직 로그
    this.logger.debug('Health check endpoint called', 'HealthController');

    const healthData = {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    this.logger.log(`Health check response: ${healthData.status}`, 'HealthController');

    return healthData;
  }
}
