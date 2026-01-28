import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

/**
 * Redis 클라이언트 관리 서비스
 *
 * Redis 연결 초기화 및 관리
 * 1.일반 클라이언트와 2.Pub/Sub 전용 클라이언트
 *
 *
 * getClient(): 일반 Redis 명령어 실행용 (SET, GET, HSET 등)
 * getSubscriber(): Socket.IO Redis Adapter Pub/Sub용
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;

  constructor(private eventEmitter: EventEmitter2) {}

  // nestJS 라이프사이클 훅 - 모듈 초기화 시점
  async onModuleInit() {
    this.logger.log('Redis 연결 초기화 중...');

    // 1. 일반 Redis 클라이언트 초기화/생성
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,

      // ioredis에 내장된 재연결 전략
      retryStrategy: (times) => {
        // 재연결 전략: 50 * 시도 수, 최대 2초
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis 재연결 대기 ${delay}ms 시도 ${times}회`);
        return delay;
      },
    });

    // 연결 이벤트 리스너 설정
    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    // 2. subscriber 클라이언트 초기화/생성
    this.subscriber = this.client.duplicate();
    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });

    try {
      await Promise.all([this.client.ping(), this.subscriber.ping()]);

      this.logger.log('✅ Redis client 연결 완료');

      // 만료 이벤트 구독
      const expiredChannel = '__keyevent@0__:expired';
      await this.subscriber.subscribe(expiredChannel);
      this.subscriber.on('message', (channel, key) => {
        if (channel === expiredChannel) {
          const parts = key.split(':');
          const prefix = parts[0];

          this.logger.debug(`[Redis Expired] Prefix: ${prefix}, Key: ${key}`);
          this.eventEmitter.emit(`redis.expired.${prefix}`, key);
        }
      });
    } catch (error) {
      this.logger.error('❌ Redis 초기 연결 실패:', error.message);
    }
  }

  // Redis 연결 종료
  async onModuleDestroy() {
    this.logger.log('Redis 연결 종료 중...');
    await this.client.quit();
    await this.subscriber.quit();
  }

  /**
   * 일반 Redis Pub
   * SET, GET, HSET
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * 구독 전용 Redis Sub
   * Socket.IO Redis Adapter
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }
}
