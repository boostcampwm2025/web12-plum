import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InteractionGateway } from './interaction.gateway.js';

describe('InteractionGateway', () => {
  let gateway: InteractionGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<InteractionGateway>(InteractionGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
