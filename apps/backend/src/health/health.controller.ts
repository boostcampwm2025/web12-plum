import { Controller, Get, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Controller('health')
export class HealthController {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  @Get()
  getHealth() {
    // 비즈니스 로직 로그 (개발 환경에서만 출력)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Health check endpoint called', 'HealthController');
    }

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
