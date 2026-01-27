import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediasoupService } from './mediasoup.service';
import { PrometheusService } from '../prometheus/prometheus.service';
import { MultiRouterManagerService } from './multi-router-manager.service';
import * as mediasoup from 'mediasoup';
import { Producer, Consumer, Transport } from 'mediasoup/node/lib/types';

// Mock mediasoup
jest.mock('mediasoup');

describe('MediasoupService', () => {
  let service: MediasoupService;
  let eventEmitter: EventEmitter2;
  let mockProducer: any;
  let mockConsumer: any;
  let mockTransport: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediasoupService,
        {
          provide: PrometheusService,
          useValue: {
            setMediasoupWorkers: jest.fn(),
            setMediasoupRouters: jest.fn(),
            setMediasoupTransports: jest.fn(),
            setMediasoupProducers: jest.fn(),
            setMediasoupConsumers: jest.fn(),
            incrementProducerByKind: jest.fn(),
            decrementProducerByKind: jest.fn(),
            incrementConsumerByKind: jest.fn(),
            decrementConsumerByKind: jest.fn(),
            setWorkerCpu: jest.fn(),
          },
        },
        {
          provide: MultiRouterManagerService,
          useValue: {
            createRoutersForRoom: jest.fn(),
            assignRouterForParticipant: jest.fn(),
            getParticipantRouter: jest.fn(),
            getParticipantRouterIndex: jest.fn(),
            getRoomRouters: jest.fn(),
            cleanupRoom: jest.fn(),
            pipeProducerToAllRouters: jest.fn(),
            pipeProducerOnDemand: jest.fn(),
            cleanupPipeProducers: jest.fn(),
            removeParticipant: jest.fn(),
            getRoomInfo: jest.fn(),
            getPipeProducerStatus: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MediasoupService>(MediasoupService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock objects setup
    mockProducer = {
      id: 'p1',
      kind: 'video',
      appData: { source: 'video', ownerId: 'u1' },
      close: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      observer: {
        on: jest.fn(),
      },
    };

    mockConsumer = {
      id: 'c1',
      kind: 'video',
      appData: { ownerId: 'u2', receiverId: 'u1' },
      close: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      on: jest.fn(), // For 'producerclose' event
      observer: {
        on: jest.fn(),
      },
    };

    mockTransport = {
      id: 't1',
      produce: jest.fn().mockResolvedValue(mockProducer),
      consume: jest.fn().mockResolvedValue(mockConsumer),
      connect: jest.fn(),
      close: jest.fn(),
      observer: {
        on: jest.fn(),
      },
    };

    // Inject mock transport into service
    (service as any).transports.set('t1', mockTransport);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('closeProducer', () => {
    it('should close producer and trigger consumer cleanup', async () => {
      // 1. Producer 생성
      const producer = await service.createProducer('t1', 'video', 'u1', 'video', {} as any);
      expect(producer).toBeDefined();
      expect(service.getProducer('p1')).toBe(producer);

      // 2. Consumer 생성
      const consumer = await service.createConsumer('t1', 'p1', 'u2', {} as any);
      expect(consumer).toBeDefined();
      expect(service.getConsumer('c1')).toBe(consumer);

      // consumer.on('producerclose', ...) 핸들러가 등록되었는지 확인
      expect(mockConsumer.on).toHaveBeenCalledWith('producerclose', expect.any(Function));
      
      // 등록된 핸들러 가져오기
      const producerCloseHandler = mockConsumer.on.mock.calls.find(call => call[0] === 'producerclose')[1];

      // 3. closeProducer 호출
      service.closeProducer('p1');

      // 4. 검증: producer.close() 호출됨
      expect(mockProducer.close).toHaveBeenCalled();

      // 5. 시뮬레이션: producer가 닫히면 mediasoup 내부에서 consumer의 'producerclose' 이벤트를 발생시킴
      // 우리는 핸들러를 직접 호출하여 이를 시뮬레이션함
      producerCloseHandler();

      // 6. 검증: consumer.close() 호출됨
      expect(mockConsumer.close).toHaveBeenCalled();

      // 7. 검증: eventEmitter.emit('consumer.closed', ...) 호출됨
      expect(eventEmitter.emit).toHaveBeenCalledWith('consumer.closed', {
        consumerId: 'c1',
        participantId: 'u2',
        producerId: 'p1',
      });
    });

    it('should throw error if producer does not exist', () => {
      expect(() => service.closeProducer('non-existent-id')).toThrow();
    });
  });
});
