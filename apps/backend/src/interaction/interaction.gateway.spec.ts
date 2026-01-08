import { Test, TestingModule } from '@nestjs/testing';
import { InteractionGateway } from './interaction.gateway.js';

describe('InteractionGateway', () => {
  let gateway: InteractionGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteractionGateway],
    }).compile();

    gateway = module.get<InteractionGateway>(InteractionGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
