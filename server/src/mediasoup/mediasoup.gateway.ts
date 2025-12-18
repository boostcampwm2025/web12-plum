import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from './mediasoup.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class MediasoupGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediasoupGateway.name);

  constructor(private readonly mediasoupService: MediasoupService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    this.mediasoupService.addPeer(client.id);

    // Send existing peers to the new client
    const existingPeers = this.mediasoupService
      .getPeerIds()
      .filter((id) => id !== client.id);
    client.emit('peers', existingPeers);

    // Notify other peers about the new peer
    client.broadcast.emit('peer-joined', client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    this.mediasoupService.removePeer(client.id);

    // Notify other peers
    client.broadcast.emit('peer-left', client.id);
  }

  @SubscribeMessage('getRouterRtpCapabilities')
  async handleGetRouterRtpCapabilities(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const capabilities = this.mediasoupService.getRouterRtpCapabilities();
      return capabilities;
    } catch (error) {
      this.logger.error('Error getting router RTP capabilities:', error);
      throw error;
    }
  }

  @SubscribeMessage('createWebRtcTransport')
  async handleCreateWebRtcTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sender: boolean },
  ) {
    try {
      const params = await this.mediasoupService.createWebRtcTransport(
        client.id,
      );
      return { params };
    } catch (error) {
      this.logger.error('Error creating WebRTC transport:', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('connectTransport')
  async handleConnectTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { transportId: string; dtlsParameters: any },
  ) {
    try {
      const result = await this.mediasoupService.connectTransport(
        data.transportId,
        data.dtlsParameters,
      );
      return result;
    } catch (error) {
      this.logger.error('Error connecting transport:', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: any;
      appData: any;
    },
  ) {
    try {
      const result = await this.mediasoupService.produce(
        data.transportId,
        client.id,
        data.kind,
        data.rtpParameters,
        data.appData,
      );

      // Notify other peers about the new producer
      client.broadcast.emit('new-producer', {
        producerId: result.id,
        socketId: client.id,
        kind: data.kind,
      });

      return result;
    } catch (error) {
      this.logger.error('Error producing:', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      transportId: string;
      producerId: string;
      rtpCapabilities: any;
    },
  ) {
    try {
      const result = await this.mediasoupService.consume(
        data.transportId,
        client.id,
        data.producerId,
        data.rtpCapabilities,
      );
      return result;
    } catch (error) {
      this.logger.error('Error consuming:', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('resume-consumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consumerId: string },
  ) {
    try {
      const result = await this.mediasoupService.resumeConsumer(data.consumerId);
      return result;
    } catch (error) {
      this.logger.error('Error resuming consumer:', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('get-producers')
  async handleGetProducers(@ConnectedSocket() client: Socket) {
    try {
      const producers = this.mediasoupService.getProducers(client.id);
      return producers;
    } catch (error) {
      this.logger.error('Error getting producers:', error);
      return [];
    }
  }
}
