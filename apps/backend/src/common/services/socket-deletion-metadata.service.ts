import { Injectable } from '@nestjs/common';
import { SocketDeletionMetadata } from '../types/index.js';

@Injectable()
export class SocketDeletionMetadataService {
  // socket.id -> { roomId, participantId, transportIds } 매핑
  private pendingDeletion: Map<string, SocketDeletionMetadata> = new Map();

  set(socketId: string, metadata: SocketDeletionMetadata): void {
    this.pendingDeletion.set(socketId, metadata);
  }

  get(socketId: string): SocketDeletionMetadata | undefined {
    return this.pendingDeletion.get(socketId);
  }

  delete(socketId: string): boolean {
    return this.pendingDeletion.delete(socketId);
  }

  addTransportId(socketId: string, transportId: string): void {
    const metadata = this.pendingDeletion.get(socketId);
    if (metadata) {
      metadata.transportIds.push(transportId);
    }
  }
}
