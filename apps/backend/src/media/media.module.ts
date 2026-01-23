import { Module } from '@nestjs/common';
import { MediaGateway } from './media.gateway.js';

@Module({
  providers: [MediaGateway],
})
export class MediaModule {}
