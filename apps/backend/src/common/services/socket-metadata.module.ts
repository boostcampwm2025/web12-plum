import { Global, Module } from '@nestjs/common';
import { SocketMetadataService } from './socket-metadata.service.js';

@Global()
@Module({
  providers: [SocketMetadataService],
  exports: [SocketMetadataService],
})
export class SocketMetadataModule {}
