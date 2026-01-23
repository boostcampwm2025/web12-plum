import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ChainableCommander } from 'ioredis';
import { RedisService } from '../redis.service';

export abstract class BaseRedisRepository<T extends { id: string } & Record<string, any>> {
  protected readonly logger: Logger;
  protected abstract readonly keyPrefix: string;

  protected constructor(
    protected readonly redisService: RedisService,
    loggerName: string,
  ) {
    this.logger = new Logger(loggerName);
  }

  protected createKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private flatten(data: Partial<T>): Record<string, string> {
    return Object.entries(data).reduce(
      (acc, [k, v]) => {
        if (v === null || v === undefined) return acc;
        acc[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private mapHashToDto(data: Record<string, string>): T {
    return Object.entries(data).reduce((acc, [k, v]) => {
      try {
        if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
          acc[k] = JSON.parse(v);
        } else if (v === 'true' || v === 'false') {
          acc[k] = v === 'true';
        } else if (!isNaN(Number(v)) && v.trim() !== '') {
          acc[k] = Number(v);
        } else {
          acc[k] = v;
        }
      } catch {
        acc[k] = v;
      }
      return acc;
    }, {} as any) as T;
  }

  async saveOne(id: string, data: T, ttl?: number): Promise<void> {
    const key = this.createKey(id);
    try {
      const flatData = this.flatten(data);
      const client = this.redisService.getClient();

      if (ttl && ttl > 0) {
        const pipeline = client.pipeline();
        pipeline.hset(key, flatData);
        pipeline.expire(key, ttl);
        await pipeline.exec();
      } else {
        await client.hset(key, flatData);
      }
      this.logger.log(`[Hash-Save] Success: ${key}`);
    } catch (error) {
      this.logger.error(`[Hash-Save] Failed: ${key}`, error.stack);
      throw new InternalServerErrorException(`Redis hset error`);
    }
  }

  addSaveToPipeline(pipeline: ChainableCommander, id: string, data: T, ttl?: number): void {
    const key = this.createKey(id);
    const flatData = this.flatten(data);

    pipeline.hset(key, flatData);
    if (ttl && ttl > 0) {
      pipeline.expire(key, ttl);
    }
  }

  async saveMany(data: T[], ttl?: number): Promise<void> {
    if (!data || data.length === 0) return;

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    data.forEach((item) => {
      this.addSaveToPipeline(pipeline, item.id, item, ttl);
    });

    const results = await pipeline.exec();

    // Pipeline 실행 결과 중 에러가 있는지 확인
    if (results) {
      for (const [err] of results) {
        if (err) {
          this.logger.error(`[saveMany] Pipeline execution error`, err);
          throw new InternalServerErrorException('데이터 일괄 저장 중 오류가 발생했습니다.');
        }
      }
    }
  }

  async findOne(id: string): Promise<T | null> {
    const key = this.createKey(id);
    try {
      const data = await this.redisService.getClient().hgetall(key);

      // Redis Hash에 데이터가 없으면 비어있는 객체({})가 반환됩니다.
      if (!data || Object.keys(data).length === 0) return null;

      return this.mapHashToDto(data);
    } catch (error) {
      this.logger.error(`[Hash-FindOne] Failed: ${key}`, error.stack);
      return null;
    }
  }

  async findMany(ids: string[]): Promise<T[]> {
    if (!ids || ids.length === 0) return [];

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    ids.forEach((id) => pipeline.hgetall(this.createKey(id)));

    const results = await pipeline.exec();
    if (!results) return [];

    return results
      .map(([err, data]) => {
        if (err) {
          this.logger.error(`[findMany] Pipeline error`, err);
          return null;
        }

        const hashData = data as Record<string, string>;
        if (!hashData || Object.keys(hashData).length === 0) return null;

        return this.mapHashToDto(hashData);
      })
      .filter((item): item is T => item !== null);
  }

  async updatePartial(id: string, partialData: Partial<T>): Promise<void> {
    const key = this.createKey(id);
    try {
      const flatData = Object.entries(partialData).reduce(
        (acc, [k, v]) => {
          acc[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return acc;
        },
        {} as Record<string, string>,
      );

      // GET 과정 없이 바로 Redis 서버에서 특정 필드만 수정
      await this.redisService.getClient().hset(key, flatData);
      this.logger.log(`[Hash-Update] Field(s) updated: ${key} -> ${Object.keys(partialData)}`);
    } catch (error) {
      this.logger.error(`[Hash-Update] Failed: ${key}`, error.stack);
    }
  }

  addUpdatePartialToPipeline(
    pipeline: ChainableCommander,
    id: string,
    partialData: Partial<T>,
  ): void {
    const key = this.createKey(id);
    const flatData = Object.entries(partialData).reduce(
      (acc, [k, v]) => {
        if (v === null || v === undefined) return acc;
        acc[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return acc;
      },
      {} as Record<string, string>,
    );

    if (Object.keys(flatData).length > 0) {
      pipeline.hset(key, flatData);
    }
  }

  async delete(id: string): Promise<void> {
    const key = this.createKey(id);
    try {
      const result = await this.redisService.getClient().del(key);
      if (result === 1) {
        this.logger.log(`[Delete] Success: ${key}`);
      } else {
        this.logger.warn(`[Delete] Key not found or already deleted: ${key}`);
      }
    } catch (error) {
      this.logger.error(`[Delete] Failed: ${key}`, error.stack);
      throw new InternalServerErrorException(`Redis delete error: ${key}`);
    }
  }

  addDeleteToPipeline(pipeline: ChainableCommander, id: string): void {
    const key = this.createKey(id);
    pipeline.del(key);
    this.logger.debug(`[Pipeline-Add] Prepare to delete: ${key}`);
  }
}
