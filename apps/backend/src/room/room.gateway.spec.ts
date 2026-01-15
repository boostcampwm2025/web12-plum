import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomGateway } from './room.gateway.js';
import { RedisService } from '../redis/redis.service.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import {
  RoomManagerService,
  ParticipantManagerService,
} from '../redis/repository-manager/index.js';

describe('RoomGateway', () => {
  let gateway: RoomGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(),
            getSubscriber: jest.fn(),
          },
        },
        {
          provide: MediasoupService,
          useValue: {
            createWebRtcTransport: jest.fn(),
            connectTransport: jest.fn(),
            closeTransport: jest.fn(),
          },
        },
        {
          provide: RoomManagerService,
          useValue: {
            removeParticipant: jest.fn(),
          },
        },
        {
          provide: ParticipantManagerService,
          useValue: {
            findOne: jest.fn(),
            updatePartial: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RoomGateway>(RoomGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
