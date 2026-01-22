/**
 * Phase 1: WebRTC 전체 플로우 부하테스트 - 공통 유틸리티
 */

// TODO: 로컬 테스트: /api prefix 없음 (nginx가 없음)
export const BACKEND_URL = 'http://localhost:3000';
// export const BACKEND_URL = 'https://tiki-plum.n-e.kr/api'; // nginx 프록시 경로

// 프론트엔드 URL
export const FRONTEND_URL = 'http://localhost:5173';
// export const FRONTEND_URL = 'https://web12-plum-dev.vercel.app';

// Origin 헤더
export const ORIGIN = 'http://localhost:5173';
// export const ORIGIN = 'https://web12-plum-dev.vercel.app';

export interface RoomInfo {
  roomId: string;
  roomName: string;
  hostId: string;
}

export interface ParticipantInfo {
  participantId: string;
  name: string;
  isHost: boolean;
}

/**
 * 강의실 생성 (HTTP POST)
 */
export async function createRoom(): Promise<RoomInfo> {
  const roomName = `Phase1_${Date.now()}`;

  const response = await fetch(`${BACKEND_URL}/room`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      name: roomName,
      hostName: 'Phase1-Host',
      isAgreed: true,
      polls: [],
      qnas: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Room creation failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    roomId: data.roomId,
    roomName: roomName,
    hostId: data.host.id,
  };
}

/**
 * 청중 등록 (HTTP POST)
 */
export async function joinAsParticipant(
  roomId: string,
  roomName: string,
  nickname: string,
): Promise<ParticipantInfo> {
  const response = await fetch(`${BACKEND_URL}/room/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      name: roomName,
      nickname: nickname,
      isAgreed: true,
      isAudioOn: false,
      isVideoOn: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Join failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();

  return {
    participantId: data.participantId,
    name: data.name,
    isHost: false,
  };
}

/**
 * 딜레이 함수
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
