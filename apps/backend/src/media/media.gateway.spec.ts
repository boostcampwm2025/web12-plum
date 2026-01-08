import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MediaGateway } from './media.gateway.js';

describe('MediaGateway', () => {
  let gateway: MediaGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<MediaGateway>(MediaGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
