import { Injectable } from '@nestjs/common';

// TODO: change real repository
export abstract class InteractionRepository {
  abstract savePoll(key: string, data: any, ttl: number): Promise<void>;
  abstract saveQna(key: string, data: any): Promise<void>;
}

@Injectable()
export class MockInteractionRepository extends InteractionRepository {
  async savePoll(key: string, data: any, ttl: number) {
    console.log('Redis에 Poll 저장됨:', data);
  }
  async saveQna(key: string, data: any) {
    console.log('Redis에 Qna 저장됨:', data);
  }
}
