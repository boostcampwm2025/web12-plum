import { Injectable } from '@nestjs/common';

// TODO: change real repository
export abstract class RoomRepository {
  abstract saveParticipant(key: string, data: any, _ttl: number): Promise<void>;
  abstract saveRoom(key: string, data: any, _ttl: number): Promise<void>;
}

@Injectable()
export class MockRoomRepository extends RoomRepository {
  async saveParticipant(key: string, data: any, _ttl: number) {
    console.log('Redis에 Participant 저장됨:', data);
  }

  async saveRoom(key: string, data: any, _ttl: number) {
    console.log('Redis에 Room 저장됨:', data);
  }
}
