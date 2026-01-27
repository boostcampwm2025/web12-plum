import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  chatMessageSchema,
  SendChatRequest,
  SendChatResponse,
  SyncChatRequest,
  SyncChatResponse,
  ChatMessage,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import {
  ParticipantManagerService,
  ChatManagerService,
} from '../redis/repository-manager/index.js';

/**
 * ChatGateway
 *
 * 담당:
 * - send_chat: 메시지 전송 → new_chat 브로드캐스트
 * - sync_chat: 재연결 동기화
 *
 * 핵심 원칙:
 * - 서버가 진실의 근원 (messageId 생성)
 * - 낙관적 업데이트 없음
 * - 발신자 포함 브로드캐스트
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly socketMetadataService: SocketMetadataService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly chatManagerService: ChatManagerService,
  ) {}

  /**
   * send_chat: 메시지 전송
   *
   * 흐름:
   * 1. Zod 검증 (1-60자)
   * 2. Rate Limiting (3초당 5개, Sliding Window)
   * 3. messageId 생성
   * 4. Redis ZSET 저장
   * 5. new_chat 브로드캐스트 (발신자 포함!)
   */
  @SubscribeMessage('send_chat')
  async handleSendChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SendChatRequest,
  ): Promise<SendChatResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    const participant = await this.participantManagerService.findOne(metadata.participantId);
    if (!participant) {
      return { success: false, error: '참가자를 찾을 수 없습니다.' };
    }

    try {
      // 1. Zod 검증
      const validation = chatMessageSchema.safeParse(data);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.errors[0]?.message || '메시지 형식이 올바르지 않습니다.',
        };
      }

      const { text } = validation.data;

      // 2. Rate Limiting (Sliding Window)
      const allowed = await this.chatManagerService.checkRateLimit(
        metadata.roomId,
        metadata.participantId,
      );
      if (!allowed) {
        return {
          success: false,
          error: '채팅 속도 제한: 3초당 최대 5개 메시지만 전송할 수 있습니다.',
        };
      }

      // 3. 메시지 생성
      const messageId = this.chatManagerService.generateMessageId();
      const timestamp = Date.now();

      const message: ChatMessage = {
        messageId,
        senderId: participant.id,
        senderName: participant.name,
        text,
        timestamp,
      };

      // 4. Redis 저장
      await this.chatManagerService.saveMessage(metadata.roomId, message);

      // 5. 브로드캐스트 (발신자 포함!) → new_chat 이벤트
      this.server.to(metadata.roomId).emit('new_chat', message);

      this.logger.log(
        `✅ [채팅] ${participant.name}: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
      );

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`❌ [채팅 실패] ${metadata.participantId}`, error);
      return { success: false, error: '메시지 전송에 실패했습니다.' };
    }
  }

  /**
   * sync_chat: 재연결 동기화
   *
   * 용도: Socket.io 자동 재연결 시 누락 메시지 보상
   * 새로고침 시에는 호출 안 함 (프론트 약속)
   */
  @SubscribeMessage('sync_chat')
  async handleSyncChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SyncChatRequest,
  ): Promise<SyncChatResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      const { lastMessageId } = data;

      if (!lastMessageId) {
        return { success: true, messages: [] };
      }

      // Redis ZSET에서 timestamp 범위 조회
      const messages = await this.chatManagerService.getMessagesAfter(
        metadata.roomId,
        lastMessageId,
      );

      this.logger.log(`🔄 [채팅 동기화] ${metadata.participantId}: ${messages.length}개`);

      return { success: true, messages };
    } catch (error) {
      this.logger.error(`❌ [채팅 동기화 실패] ${metadata.participantId}`, error);
      return { success: false, error: '채팅 동기화에 실패했습니다.' };
    }
  }
}
