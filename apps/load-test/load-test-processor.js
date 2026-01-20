/**
 * Artillery 부하테스트 프로세서
 * 실제 HTTP 요청, Socket.IO 연결을 수행합니다.
 */

import { io } from 'socket.io-client';

const BACKEND_URL = 'http://223.130.140.152:3000';

// 전역 변수: 첫 번째 사용자만 강의실을 생성하고, 나머지는 재사용
let globalRoomId = null;
let globalRoomName = null;
let isCreatingRoom = false;

/**
 * 1단계: 강의실 생성 또는 재사용
 */
export async function ensureRoom(context) {
  if (!context.vars) {
    context.vars = {};
  }

  // 이미 강의실이 있으면 재사용
  if (globalRoomId) {
    context.vars.roomId = globalRoomId;
    context.vars.roomName = globalRoomName;
    console.log(`✅ 기존 강의실 사용: ${globalRoomId}`);
    return;
  }

  // 다른 사용자가 강의실 생성 중이면 대기
  if (isCreatingRoom) {
    console.log(`⏳ 강의실 생성 대기...`);
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (globalRoomId) {
        context.vars.roomId = globalRoomId;
        context.vars.roomName = globalRoomName;
        console.log(`✅ 대기 완료: ${globalRoomId}`);
        return;
      }
    }
    throw new Error('Room creation timeout');
  }

  // 첫 번째 사용자가 강의실 생성
  isCreatingRoom = true;
  const roomName = `부하테스트_${Date.now()}`;

  try {
    const response = await fetch(`${BACKEND_URL}/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roomName,
        hostName: '부하테스트_호스트',
        isAgreed: true,
        polls: [],
        qnas: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Room creation failed: ${response.status}`);
    }

    const data = await response.json();
    globalRoomId = data.roomId;
    globalRoomName = roomName;
    isCreatingRoom = false;

    context.vars.roomId = data.roomId;
    context.vars.roomName = roomName;
    console.log(`✅ 강의실 생성: ${data.roomId}`);
  } catch (error) {
    console.error('❌ 강의실 생성 실패:', error.message);
    isCreatingRoom = false;
    throw error;
  }
}

/**
 * 2단계: 참가자 등록 (HTTP POST)
 */
export async function joinAsParticipant(context) {
  const roomId = context.vars.roomId;
  const roomName = context.vars.roomName;
  const nickname = `참가자_${Math.floor(Math.random() * 100000)}`;

  if (!roomId || !roomName) {
    throw new Error('No room ID or name');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/room/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roomName,
        nickname: nickname,
        isAgreed: true,
        isAudioOn: false,
        isVideoOn: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Join failed: ${response.status}`);
    }

    const data = await response.json();
    context.vars.participantId = data.participantId;
    context.vars.participantName = data.name;

    console.log(`✅ 참가자 등록: ${data.name}`);
  } catch (error) {
    console.error('❌ 참가자 등록 실패:', error.message);
    throw error;
  }
}

/**
 * 3단계: Socket.IO 연결 + join_room 이벤트
 */
export function connectAndJoinRoom(context) {
  const roomId = context.vars.roomId;
  const participantId = context.vars.participantId;

  if (!roomId || !participantId) {
    throw new Error('Missing roomId or participantId');
  }

  return new Promise((resolve, reject) => {
    const socket = io(`${BACKEND_URL}/session`, {
      transports: ['websocket'],
      reconnection: false,
    });

    let hasFinished = false;

    socket.on('connect', () => {
      console.log(`🔌 Socket 연결: ${context.vars.participantName}`);

      // join_room 이벤트 전송
      socket.emit('join_room', { roomId, participantId }, (response) => {
        if (response && response.success) {
          console.log(`✅ 입장 성공: ${context.vars.participantName}`);
          if (!hasFinished) {
            hasFinished = true;
            context.vars.socket = socket;
            resolve();
          }
        } else {
          console.error('❌ join_room 실패:', response?.error);
          socket.disconnect();
          if (!hasFinished) {
            hasFinished = true;
            reject(new Error(response?.error || 'join_room failed'));
          }
        }
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket 연결 실패:', error.message);
      if (!hasFinished) {
        hasFinished = true;
        reject(error);
      }
    });

    // 타임아웃 10초
    setTimeout(() => {
      if (!hasFinished) {
        hasFinished = true;
        console.error('❌ Socket 타임아웃');
        socket.disconnect();
        reject(new Error('Socket timeout'));
      }
    }, 10000);
  });
}

/**
 * 4단계: 연결 유지 (5초 대기)
 */
export function maintainConnection() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });
}

/**
 * 5단계: Socket 연결 종료
 */
export function disconnectSocket(context) {
  const socket = context.vars.socket;

  if (socket && socket.connected) {
    socket.disconnect();
    console.log(`🔌 연결 종료: ${context.vars.participantName}`);
  }
}
