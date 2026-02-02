import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';
import { SocketMetadata } from '../types/index.js';

const SOCKET_KEY_PREFIX = 'socket';

@Injectable()
export class SocketMetadataService {
  constructor(private readonly redisService: RedisService) {}

  // 소켓 메타데이터를 저장할 때 사용할 키 생성
  private key(socketId: string): string {
    return `${SOCKET_KEY_PREFIX}:${socketId}`;
  }

  // 소켓 메타데이터 저장
  async set(socketId: string, metadata: SocketMetadata): Promise<void> {
    const client = this.redisService.getClient();
    await client.hset(this.key(socketId), {
      roomId: metadata.roomId,
      participantId: metadata.participantId,
      transportIds: JSON.stringify(metadata.transportIds),
    });
  }

  // 소켓 메타데이터 조회
  async get(socketId: string): Promise<SocketMetadata | null> {
    const client = this.redisService.getClient();
    const data = await client.hgetall(this.key(socketId));
    if (!data || !data.roomId) return null;

    return {
      roomId: data.roomId,
      participantId: data.participantId,
      transportIds: JSON.parse(data.transportIds),
    };
  }

  // 소켓 메타데이터 삭제
  async delete(socketId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.del(this.key(socketId));
    return result > 0;
  }
  // transportId 추가
  async addTransportId(socketId: string, transportId: string): Promise<void> {
    const metadata = await this.get(socketId);
    if (metadata) {
      metadata.transportIds.push(transportId);
      const client = this.redisService.getClient();
      await client.hset(this.key(socketId), 'transportIds', JSON.stringify(metadata.transportIds));
    }
  }
}
