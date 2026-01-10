import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { AppModule } from '../src/app.module.js';
import { SOCKET_CONFIG } from '../src/common/constants/socket.constants.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let clientSocket: ClientSocket;
  const socketNamespace = SOCKET_CONFIG.namespace;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await app.listen(0);
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
        expect(typeof res.body.timestamp).toBe('number');
      });
  });

  it('WebSocket 연결이 성공해야 한다', (done) => {
    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? '' : address.port;

    // SOCKET_CONFIG에 설정된 namespace가 'session'이라고 가정
    clientSocket = io(`http://localhost:${port}/${socketNamespace}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done(); // 비동기 테스트 종료 알림
    });

    clientSocket.on('connect_error', (err) => {
      done(err); // 연결 실패 시 에러와 함께 종료
    });
  });
});
