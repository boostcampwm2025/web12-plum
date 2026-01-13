/**
 * 애플리케이션 라우트 경로
 */
export const ROUTES = {
  /** 메인 페이지 */
  HOME: '/',
  /** 강의실 생성 */
  CREATE: '/create',
  /** 강의실 입장 페이지 */
  ENTER: (roomId: string = ':roomId') => `/enter/${roomId}`,
  /** 강의실 */
  ROOM: (roomId: string = ':roomId') => `/rooms/${roomId}`,
  /** 강의 요약 */
  ROOM_SUMMARY: (roomId: string = ':roomId') => `/rooms/${roomId}/summary`,
  /** 404 Not Found */
  NOT_FOUND: '*',
} as const;
