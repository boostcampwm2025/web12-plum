import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Participant, Room } from '@plum/shared-interfaces';
import { SocketMetadataService } from '../services/index.js';
import {
  ParticipantManagerService,
  RoomManagerService,
} from '../../redis/repository-manager/index.js';

@Injectable()
export abstract class WsBaseGuard implements CanActivate {
  protected constructor(
    protected readonly socketMetadataService: SocketMetadataService,
    protected readonly participantManagerService: ParticipantManagerService,
    protected readonly roomManagerService: RoomManagerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient();

    const metadata = await this.socketMetadataService.get(socket.id);
    if (!metadata) throw new WsException('세션이 만료되었습니다.');

    const [participant, room] = await Promise.all([
      this.participantManagerService.findOne(metadata.participantId),
      this.roomManagerService.findOne(metadata.roomId),
    ]);

    if (!participant || !room) throw new WsException('정보를 찾을 수 없습니다.');

    await this.validateRole(room, participant);

    // 소켓 객체에 데이터 주입 (핸들러에서 꺼내 쓰기 용도)
    socket.data.room = room;
    socket.data.participant = participant;

    return true;
  }

  // 자식 가드에서 반드시 구현해야 할 메서드
  protected abstract validateRole(room: Room, participant: Participant): Promise<void> | void;
}
