import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

describe('HealthController', () => {
  let controller: HealthController;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.getHealth();
    expect(result).toHaveProperty('status');
    expect(result.status).toBe('ok');
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.timestamp).toBe('number');
  });
});
