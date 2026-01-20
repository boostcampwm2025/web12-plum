import { CORS_CONFIG } from './cors.constants.js';

export const SOCKET_NAMESPACE = 'session';

export const SOCKET_TIMEOUT = 15 * 1000;

export const SOCKET_CONFIG = {
  namespace: SOCKET_NAMESPACE,
  cors: CORS_CONFIG,
  transports: ['websocket'],
};
