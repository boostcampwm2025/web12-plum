import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { mediasoupConfig } from '../config/mediasoup.config';

type Worker = mediasoup.types.Worker;
type Router = mediasoup.types.Router;
type WebRtcTransport = mediasoup.types.WebRtcTransport;
type Producer = mediasoup.types.Producer<any>;
type Consumer = mediasoup.types.Consumer<any>;
type DtlsState = mediasoup.types.DtlsState;

export interface PeerData {
  socketId: string;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

export interface TransportData {
  transport: WebRtcTransport;
  socketId: string;
}

export interface ProducerData {
  producer: Producer;
  socketId: string;
}

export interface ConsumerData {
  consumer: Consumer;
  socketId: string;
}

@Injectable()
export class MediasoupService implements OnModuleInit {
  private readonly logger = new Logger(MediasoupService.name);
  private worker: Worker;
  private router: Router;
  private readonly transports = new Map<string, TransportData>();
  private readonly producers = new Map<string, ProducerData>();
  private readonly consumers = new Map<string, ConsumerData>();
  private readonly peers = new Map<string, PeerData>();

  async onModuleInit() {
    await this.initMediasoup();
  }

  private async initMediasoup() {
    this.worker = await mediasoup.createWorker({
      rtcMinPort: mediasoupConfig.mediasoup.worker.rtcMinPort,
      rtcMaxPort: mediasoupConfig.mediasoup.worker.rtcMaxPort,
      logLevel: mediasoupConfig.mediasoup.worker.logLevel,
      logTags: [...mediasoupConfig.mediasoup.worker.logTags],
    });

    this.logger.log(`Worker created [pid:${this.worker.pid}]`);

    this.worker.on('died', () => {
      this.logger.error('Worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    this.router = await this.worker.createRouter({
      mediaCodecs: mediasoupConfig.mediasoup.router.mediaCodecs,
    });

    this.logger.log('Router created');
  }

  getRouterRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(socketId: string) {
    const transport = await this.router.createWebRtcTransport(
      mediasoupConfig.mediasoup.webRtcTransport,
    );

    this.logger.log(`WebRtcTransport created [id:${transport.id}]`);

    transport.on('dtlsstatechange', (dtlsState: DtlsState) => {
      if (dtlsState === 'closed') {
        this.logger.log(`WebRtcTransport closed [id:${transport.id}]`);
        transport.close();
      }
    });

    const peer = this.peers.get(socketId);
    if (peer) {
      peer.transports.set(transport.id, transport);
    }

    this.transports.set(transport.id, {
      transport,
      socketId,
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(transportId: string, dtlsParameters: any) {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error('Transport not found');
    }

    await transportData.transport.connect({ dtlsParameters });
    return { success: true };
  }

  async produce(
    transportId: string,
    socketId: string,
    kind: 'audio' | 'video',
    rtpParameters: any,
    appData: any,
  ) {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error('Transport not found');
    }

    const producer = await transportData.transport.produce({
      kind,
      rtpParameters,
      appData,
    });

    const peer = this.peers.get(socketId);
    if (peer) {
      peer.producers.set(producer.id, producer);
    }

    this.producers.set(producer.id, {
      producer,
      socketId,
    });

    producer.on('transportclose', () => {
      this.logger.log(`Producer transport closed [producerId:${producer.id}]`);
      producer.close();
      if (peer) {
        peer.producers.delete(producer.id);
      }
      this.producers.delete(producer.id);
    });

    return {
      id: producer.id,
      kind: producer.kind,
    };
  }

  async consume(
    transportId: string,
    socketId: string,
    producerId: string,
    rtpCapabilities: any,
  ) {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error('Transport not found');
    }

    const producerData = this.producers.get(producerId);
    if (!producerData) {
      throw new Error('Producer not found');
    }

    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    const consumer = await transportData.transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    const peer = this.peers.get(socketId);
    if (peer) {
      peer.consumers.set(consumer.id, consumer);
    }

    this.consumers.set(consumer.id, {
      consumer,
      socketId,
    });

    consumer.on('transportclose', () => {
      this.logger.log(`Consumer transport closed [consumerId:${consumer.id}]`);
      consumer.close();
      if (peer) {
        peer.consumers.delete(consumer.id);
      }
      this.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      this.logger.log(`Consumer producer closed [consumerId:${consumer.id}]`);
      consumer.close();
      if (peer) {
        peer.consumers.delete(consumer.id);
      }
      this.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId: producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(consumerId: string) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) {
      throw new Error('Consumer not found');
    }

    await consumerData.consumer.resume();
    return { success: true };
  }

  getProducers(socketId: string) {
    const producerList: Array<{
      producerId: string;
      socketId: string;
      kind: string;
    }> = [];

    this.producers.forEach((data, producerId) => {
      if (data.socketId !== socketId) {
        producerList.push({
          producerId,
          socketId: data.socketId,
          kind: data.producer.kind,
        });
      }
    });

    return producerList;
  }

  addPeer(socketId: string) {
    this.peers.set(socketId, {
      socketId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    });
  }

  removePeer(socketId: string) {
    const peer = this.peers.get(socketId);
    if (peer) {
      // Close all transports
      peer.transports.forEach((transport) => {
        transport.close();
        this.transports.delete(transport.id);
      });

      // Close all producers
      peer.producers.forEach((producer) => {
        producer.close();
        this.producers.delete(producer.id);
      });

      // Close all consumers
      peer.consumers.forEach((consumer) => {
        consumer.close();
        this.consumers.delete(consumer.id);
      });

      this.peers.delete(socketId);
    }
  }

  getPeerIds() {
    return Array.from(this.peers.keys());
  }
}
