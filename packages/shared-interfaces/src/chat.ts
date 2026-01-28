import { z } from 'zod';

/**
 * 채팅 메시지 검증 스키마
 * - 1-60자 제한
 * - trim 적용 (공백 제거)
 */
export const chatMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, '메시지는 1자 이상이어야 합니다.')
    .max(60, '메시지는 60자를 초과할 수 없습니다.'),
});

export type SendChatRequest = z.infer<typeof chatMessageSchema>;

/**
 * 채팅 메시지 구조
 * messageId: {timestamp}-{senderId}-{random} 형식으로 서버에서 생성
 * timestamp: 서버 시간 (밀리초), 순서 보장에 사용
 */
export interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

/**
 * 재연결 시 동기화 요청
 * lastMessageId: 클라이언트가 마지막으로 받은 메시지 ID
 * 소켓이 불안정할때 재연결시에 순서지킴이
 * 서버는 이 ID 이후의 메시지만 반환
 */
export interface SyncChatRequest {
  lastMessageId: string;
}
