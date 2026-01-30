import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';

@Module({
  providers: [ChatGateway],
})
export class ChatModule {}
