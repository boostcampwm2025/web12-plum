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
  CHAT_POLICY,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import {
  ParticipantManagerService,
  ChatManagerService,
  ActivityScoreManagerService,
} from '../redis/repository-manager/index.js';

/**
 * ChatGateway
 *
 * 담당:
 * - send_chat: 메시지 전송 → new_chat 브로드캐스트 (재시도 포함)
 * - sync_chat: 재연결 동기화
 *
 * - 서버가 진실의 근원 (messageId 생성)
 * - 낙관적 업데이트 없음
 * - 발신자 포함 브로드캐스트
 * - 제한된 지수 백오프 재시도 (5회, Rate Limit 제외)
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  // 제한된 지수 백오프 전략 (밀리초)
  private readonly RETRY_DELAYS = [100, 300, 1000, 3000, 5000];
  private readonly MAX_RETRIES = 5;

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly socketMetadataService: SocketMetadataService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly chatManagerService: ChatManagerService,
    private readonly activityScoreManagerService: ActivityScoreManagerService,
  ) {}

  /**
   * send_chat: 메시지 전송 (재시도 포함)
   *
   * 1. Zod 검증 (1-60자)
   * 2. Rate Limiting (3초당 5개, Sliding Window)
   * 3. messageId 생성
   * 4. Redis ZSET 저장 (재시도 로직 포함)
   * 5. new_chat 브로드캐스트 (발신자 포함!)
   */
  @SubscribeMessage('send_chat')
  async handleSendChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SendChatRequest,
  ): Promise<SendChatResponse> {
    const metadata = await this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.', retryable: false };
    }

    const participant = await this.participantManagerService.findOne(metadata.participantId);
    if (!participant) {
      return { success: false, error: '참가자를 찾을 수 없습니다.', retryable: false };
    }

    // 1. Zod 검증
    const validation = chatMessageSchema.safeParse(data);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return {
        success: false,
        error: firstError?.message || '메시지 형식이 올바르지 않습니다.',
        retryable: false, // 검증 오류는 재시도해도 소용없음
      };
    }

    const { text } = validation.data;

    // 2. Rate Limiting (Sliding Window)
    const allowed = await this.chatManagerService.checkRateLimit(
      metadata.roomId,
      metadata.participantId,
    );
    if (!allowed) {
      if (participant.role === 'audience') {
        await this.activityScoreManagerService.applyPenalty(metadata.roomId, metadata.participantId);
      }

      const timeLimit = Math.ceil(CHAT_POLICY.LIMIT.WINDOW_MS / 1000);
      return {
        success: false,
        error: `채팅 속도 제한: ${timeLimit}초당 최대 ${CHAT_POLICY.LIMIT.MAX_MESSAGES}개 메시지만 전송할 수 있습니다.`,
        retryable: false, // Rate Limit은 재시도하면 안 됨!
      };
    }

    // 3. 참여도 점수 올리기
    if (participant.role === 'audience') {
      await this.activityScoreManagerService.updateScore(
        metadata.roomId,
        metadata.participantId,
        'chat',
      );
    }

    // 4. 메시지 생성
    const messageId = this.chatManagerService.generateMessageId();
    const timestamp = Date.now();

    const message: ChatMessage = {
      messageId,
      senderId: participant.id,
      senderName: participant.name,
      text,
      timestamp,
    };

    // 5. Redis 저장 (재시도 로직 포함)
    const saveResult = await this.saveMessageWithRetry(metadata.roomId, message);
    if (!saveResult.success) {
      return saveResult;
    }

    // 6. 브로드캐스트 (발신자 포함!) → new_chat 이벤트
    this.server.to(metadata.roomId).emit('new_chat', message);

    this.logger.log(
      `✅ [채팅] ${participant.name}: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
    );

    return { success: true, messageId };
  }

  /**
   * 제한된 지수 백오프 재시도로 메시지 저장
   *
   * 재시도 전략:
   * - 1차: 100ms 대기
   * - 2차: 300ms 대기
   * - 3차: 1000ms 대기
   * - 4차: 3000ms 대기
   * - 5차: 5000ms 대기
   * - 총 9.4초
   *
   * @param roomId 방 ID
   * @param message 메시지 객체
   * @returns 성공/실패 응답
   */
  private async saveMessageWithRetry(
    roomId: string,
    message: ChatMessage,
  ): Promise<SendChatResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Redis 저장 시도
        await this.chatManagerService.saveMessage(roomId, message);

        if (attempt > 0) {
          this.logger.log(`✅ [재시도 성공] ${attempt}번째 시도에서 성공 - ${message.messageId}`);
        }

        return { success: true, messageId: message.messageId };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 마지막 시도였다면 더 이상 재시도 안 함
        if (attempt === this.MAX_RETRIES) {
          this.logger.error(
            `❌ [재시도 실패] ${this.MAX_RETRIES}번 모두 실패 - ${message.messageId}`,
            lastError,
          );
          break;
        }

        // 백오프 대기
        const delay = this.RETRY_DELAYS[attempt];
        this.logger.warn(
          `⚠️ [재시도 대기] ${attempt + 1}/${this.MAX_RETRIES} - ${delay}ms 후 재시도 - ${message.messageId}`,
        );
        await this.sleep(delay);
      }
    }

    // 모든 재시도 실패
    return {
      success: false,
      error: '메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      retryable: true, // 클라이언트가 원한다면 다시 시도 가능
    };
  }

  /**
   * 지정된 시간만큼 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * sync_chat: 재연결 동기화
   *
   * Socket.io 자동 재연결 시 누락 메시지 보상
   * 새로고침 시에는 호출 안 함 (프론트 약속)
   */
  @SubscribeMessage('sync_chat')
  async handleSyncChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SyncChatRequest,
  ): Promise<SyncChatResponse> {
    const metadata = await this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      const { lastMessageId } = data;

      if (!lastMessageId) {
        return { success: true, messages: [] };
      }

      // Rate Limiting (30초당 10개)
      const allowed = await this.chatManagerService.checkSyncRateLimit(
        metadata.roomId,
        metadata.participantId,
      );
      if (!allowed) {
        return {
          success: false,
          error: '동기화 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.',
        };
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
