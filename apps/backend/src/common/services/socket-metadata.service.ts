import { Injectable } from '@nestjs/common';
import { SocketMetadata } from '../types/index.js';

@Injectable()
export class SocketMetadataService {
  // socket.id -> { roomId, participantId, transportIds } 매핑
  private socketMetadata: Map<string, SocketMetadata> = new Map();

  set(socketId: string, metadata: SocketMetadata): void {
    this.socketMetadata.set(socketId, metadata);
  }

  get(socketId: string): SocketMetadata | undefined {
    return this.socketMetadata.get(socketId);
  }

  delete(socketId: string): boolean {
    return this.socketMetadata.delete(socketId);
  }

  addTransportId(socketId: string, transportId: string): void {
    const metadata = this.socketMetadata.get(socketId);
    if (metadata) {
      metadata.transportIds.push(transportId);
    }
  }
}
