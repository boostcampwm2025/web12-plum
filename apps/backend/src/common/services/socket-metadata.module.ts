import { Global, Module } from '@nestjs/common';
import { SocketMetadataService } from './socket-metadata.service.js';
import { SocketDeletionMetadataService } from './socket-deletion-metadata.service.js';

@Global()
@Module({
  providers: [SocketMetadataService, SocketDeletionMetadataService],
  exports: [SocketMetadataService, SocketDeletionMetadataService],
})
export class SocketMetadataModule {}
