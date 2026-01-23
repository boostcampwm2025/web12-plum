import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

/**
 * Socket.IO Redis Adapter
 *
 * Socket.IO 이벤트를 Redis Pub/Sub으로 동기화
 * 여러 백엔드 인스턴스 간 실시간 메시지 브로드캐스트
 * 수평 확장 (Horizontal Scaling) 지원
 *
 * 서버 A의 클라이언트가 채팅 메시지 전송
 * 서버 B의 클라이언트도 동일한 메시지 수신 가능
 *
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  /**
   * Socket.IO 서버 생성 시에 Redis Adapter 적용
   */
  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);

    this.setupRedisAdapter(server);

    return server;
  }

  /**
   * Redis Adapter 설정 (재시도 로직)
   * Redis가 준비될 때까지 재시도
   * 10번 재시도, 지연 시간은 매번 2배 증가 -> 이러면 최대 51초까지 기다림
   */
  private setupRedisAdapter(server: any, retries = 10, delay = 50): void {
    // Redis 클라이언트 가져오기
    const pubClient = this.redisService.getClient();
    const subClient = this.redisService.getSubscriber();

    // RedisService가 연결을 만들어서 들고있는지
    if (pubClient && subClient) {
      try {
        // Redis Adapter 생성하고 socket.io 서버에 설정
        const redisAdapter = createAdapter(pubClient, subClient);
        server.adapter(redisAdapter);
        this.logger.log('✅ Socket.IO Redis Adapter 설정 완료');
        return;
      } catch (error) {
        //Redis Adapter를 붙이는 데 실패
        this.logger.error('❌ Redis Adapter에 생성 실패:', error);
        return;
      }
    }

    // null이거나 undefined이면 아직 준비 안됨 => Redis가 늦게 뜬 것뿐
    // 재시도
    if (retries > 0) {
      setTimeout(() => {
        this.setupRedisAdapter(server, retries - 1, delay * 2);
      }, delay);
    } else {
      this.logger.warn('⚠️  Redis Adapter 설정 실패: Redis 클라이언트가 준비되지 않았습니다.');
    }
  }
}
