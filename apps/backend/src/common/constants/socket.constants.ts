import { CORS_CONFIG } from './cors.constants.js';

export const SOCKET_NAMESPACE = 'session';

export const SOCKET_TIMEOUT = 30;

// 세션 관련 Redis 키 TTL (초) - 서버 크래시 시 자동 정리용
export const SESSION_TTL = 86400; // 24시간
// Heartbeat 주기 (밀리초) - TTL 갱신 간격
export const HEARTBEAT_INTERVAL = 60_000; // 1분

export const SOCKET_CONFIG = {
  namespace: SOCKET_NAMESPACE,
  cors: CORS_CONFIG,
  transports: ['websocket'],
};
