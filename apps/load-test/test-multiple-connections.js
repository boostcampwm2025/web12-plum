// 여러 Socket.IO 연결 생성 스크립트
import { io } from 'socket.io-client';

const NUM_CONNECTIONS = 30;
const connections = [];

console.log(`${NUM_CONNECTIONS}개의 연결 생성 시작...`);

for (let i = 0; i < NUM_CONNECTIONS; i++) {
  setTimeout(() => {
    const socket = io('http://localhost:3000/session', {
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      console.log(`✅ 연결 ${i + 1}/${NUM_CONNECTIONS} 성공 (ID: ${socket.id})`);
      connections.push(socket);

      // 모든 연결이 완료되면
      if (connections.length === NUM_CONNECTIONS) {
        console.log(`\n🎉 ${NUM_CONNECTIONS}개 연결 완료!`);
        console.log('60초 동안 유지합니다. Grafana에서 확인!');

        // 60초 후 모두 종료
        setTimeout(() => {
          console.log('\n연결 종료 중...');
          connections.forEach((s) => s.disconnect());
          process.exit(0);
        }, 60000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ 연결 ${i + 1} 실패:`, error.message);
    });
  }, i * 100); // 100ms 간격으로 연결
}
