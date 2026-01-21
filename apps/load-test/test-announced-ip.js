import { io } from 'socket.io-client';

const BACKEND_URL = 'http://223.130.140.152:3000';
const roomId = '01KFFY1B6Y4Y4MX8NE07BQDYT2';
const participantId = '01KFFY1B6YYC0PG3RV1XFGYWCY';

console.log('🔌 Socket.IO 연결 중...');

const socket = io(`${BACKEND_URL}/session`, {
  transports: ['websocket'],
  reconnection: false,
});

socket.on('connect', () => {
  console.log('✅ Socket 연결 성공');

  socket.emit('join_room', { roomId, participantId }, (response) => {
    if (response && response.success) {
      console.log('✅ join_room 성공');

      socket.emit('create_transport', { roomId, direction: 'recv' }, (transportResponse) => {
        console.log('\n📦 전체 응답:');
        console.log(JSON.stringify(transportResponse, null, 2));

        if (transportResponse.success && transportResponse.transportOptions) {
          console.log('\n📋 ICE Candidates:');
          const candidates = transportResponse.transportOptions.iceCandidates;
          console.log(JSON.stringify(candidates, null, 2));

          const ips = candidates.map((c) => c.ip);
          console.log('\n🌐 사용된 IP 주소들:', [...new Set(ips)]);

          // 127.0.0.1이면 ANNOUNCED_IP 설정 안 됨
          if (ips.includes('127.0.0.1')) {
            console.log('⚠️  경고: 127.0.0.1 발견! ANNOUNCED_IP가 설정되지 않았습니다.');
          } else {
            console.log('✅ ANNOUNCED_IP가 올바르게 설정되었습니다.');
          }
        }

        socket.disconnect();
        process.exit(0);
      });
    } else {
      console.error('❌ join_room 실패:', response?.error);
      socket.disconnect();
      process.exit(1);
    }
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket 연결 실패:', error.message);
  process.exit(1);
});
