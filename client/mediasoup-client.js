// mediasoup-client.js - WebRTC SFU client for video conferencing

import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';

export class MediasoupClient {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map(); // local producers (audio/video)
    this.consumers = new Map(); // remote consumers
    this.peers = new Map(); // remote peer information

    // Callbacks
    this.onPeerJoined = null;
    this.onPeerLeft = null;
    this.onNewConsumer = null;
  }

  // Initialize connection to mediasoup server
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        console.log('[MediasoupClient] Connected to server');
        this._setupSocketListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[MediasoupClient] Connection error:', error);
        reject(error);
      });
    });
  }

  // Setup socket event listeners
  _setupSocketListeners() {
    // Existing peers list
    this.socket.on('peers', (peerIds) => {
      console.log('[MediasoupClient] Existing peers:', peerIds);
      peerIds.forEach(peerId => {
        this.peers.set(peerId, { socketId: peerId, consumers: new Map() });
      });
    });

    // New peer joined
    this.socket.on('peer-joined', (peerId) => {
      console.log('[MediasoupClient] Peer joined:', peerId);
      this.peers.set(peerId, { socketId: peerId, consumers: new Map() });
      if (this.onPeerJoined) {
        this.onPeerJoined(peerId);
      }
    });

    // Peer left
    this.socket.on('peer-left', (peerId) => {
      console.log('[MediasoupClient] Peer left:', peerId);
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.consumers.forEach(consumer => {
          this.consumers.delete(consumer.id);
        });
        this.peers.delete(peerId);
      }
      if (this.onPeerLeft) {
        this.onPeerLeft(peerId);
      }
    });

    // New producer available
    this.socket.on('new-producer', async ({ producerId, socketId, kind }) => {
      console.log('[MediasoupClient] New producer:', { producerId, socketId, kind });
      await this._consumeStream(producerId, socketId, kind);
    });

    // Producer closed
    this.socket.on('producer-closed', ({ consumerId }) => {
      console.log('[MediasoupClient] Producer closed:', consumerId);
      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        consumer.close();
        this.consumers.delete(consumerId);
      }
    });
  }

  // Initialize mediasoup Device
  async initDevice() {
    try {
      this.device = new Device();

      const rtpCapabilities = await this._sendRequest('getRouterRtpCapabilities');
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });

      console.log('[MediasoupClient] Device initialized');
      console.log('[MediasoupClient] Can produce video:', this.device.canProduce('video'));
      console.log('[MediasoupClient] Can produce audio:', this.device.canProduce('audio'));
    } catch (error) {
      console.error('[MediasoupClient] Failed to initialize device:', error);
      throw error;
    }
  }

  // Create send transport for producing media
  async createSendTransport() {
    try {
      const { params } = await this._sendRequest('createWebRtcTransport', { sender: true });

      this.sendTransport = this.device.createSendTransport(params);

      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await this._sendRequest('connectTransport', {
            transportId: this.sendTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error);
        }
      });

      this.sendTransport.on('produce', async (parameters, callback, errback) => {
        try {
          const { id } = await this._sendRequest('produce', {
            transportId: this.sendTransport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
          });
          callback({ id });
        } catch (error) {
          errback(error);
        }
      });

      console.log('[MediasoupClient] Send transport created');
    } catch (error) {
      console.error('[MediasoupClient] Failed to create send transport:', error);
      throw error;
    }
  }

  // Create receive transport for consuming media
  async createRecvTransport() {
    try {
      const { params } = await this._sendRequest('createWebRtcTransport', { sender: false });

      this.recvTransport = this.device.createRecvTransport(params);

      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await this._sendRequest('connectTransport', {
            transportId: this.recvTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error);
        }
      });

      console.log('[MediasoupClient] Receive transport created');
    } catch (error) {
      console.error('[MediasoupClient] Failed to create receive transport:', error);
      throw error;
    }
  }

  // Produce local media stream (camera/microphone)
  async produce(track, appData = {}) {
    try {
      if (!this.sendTransport) {
        await this.createSendTransport();
      }

      const producer = await this.sendTransport.produce({
        track,
        appData,
      });

      this.producers.set(producer.id, producer);

      producer.on('trackended', () => {
        console.log('[MediasoupClient] Track ended:', producer.id);
      });

      producer.on('transportclose', () => {
        console.log('[MediasoupClient] Transport closed:', producer.id);
        this.producers.delete(producer.id);
      });

      console.log('[MediasoupClient] Producing:', producer.kind);
      return producer;
    } catch (error) {
      console.error('[MediasoupClient] Failed to produce:', error);
      throw error;
    }
  }

  // Consume remote streams from existing producers
  async consumeExistingProducers() {
    try {
      const producerList = await this._sendRequest('get-producers');
      console.log('[MediasoupClient] Existing producers:', producerList);

      for (const { producerId, socketId, kind } of producerList) {
        await this._consumeStream(producerId, socketId, kind);
      }
    } catch (error) {
      console.error('[MediasoupClient] Failed to consume existing producers:', error);
    }
  }

  // Internal method to consume a stream
  async _consumeStream(producerId, socketId, kind) {
    try {
      if (!this.recvTransport) {
        await this.createRecvTransport();
      }

      const { id, rtpParameters } = await this._sendRequest('consume', {
        transportId: this.recvTransport.id,
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      });

      const consumer = await this.recvTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      });

      this.consumers.set(consumer.id, consumer);

      const peer = this.peers.get(socketId);
      if (peer) {
        peer.consumers.set(consumer.id, consumer);
      }

      await this._sendRequest('resume-consumer', { consumerId: consumer.id });

      console.log('[MediasoupClient] Consuming:', { producerId, kind });

      if (this.onNewConsumer) {
        this.onNewConsumer(consumer, socketId);
      }

      return consumer;
    } catch (error) {
      console.error('[MediasoupClient] Failed to consume stream:', error);
    }
  }

  // Send request to server via Socket.IO
  _sendRequest(event, data = {}) {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Close all producers
  closeProducers() {
    this.producers.forEach(producer => {
      producer.close();
    });
    this.producers.clear();
  }

  // Close all consumers
  closeConsumers() {
    this.consumers.forEach(consumer => {
      consumer.close();
    });
    this.consumers.clear();
  }

  // Disconnect from server
  disconnect() {
    this.closeProducers();
    this.closeConsumers();

    if (this.sendTransport) {
      this.sendTransport.close();
    }
    if (this.recvTransport) {
      this.recvTransport.close();
    }
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('[MediasoupClient] Disconnected');
  }
}
