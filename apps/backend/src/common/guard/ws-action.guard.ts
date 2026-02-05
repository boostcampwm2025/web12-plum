import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Participant, Room } from '@plum/shared-interfaces';

import { WsBaseGuard } from './ws-base.guard.js';

@Injectable()
export class WsPresenterGuard extends WsBaseGuard {
  protected validateRole(room: Room, participant: Participant) {
    if (room.status !== 'active') {
      throw new WsException('활성화된 강의가 아닙니다.');
    }
    if (participant.role !== 'presenter' || room.presenter !== participant.id) {
      throw new WsException('발표자 권한이 없습니다.');
    }
  }
}

@Injectable()
export class WsAudienceGuard extends WsBaseGuard {
  protected validateRole(room: Room, participant: Participant) {
    if (room.status !== 'active') {
      throw new WsException('활성화된 강의가 아닙니다.');
    }
    if (participant.role !== 'audience') {
      throw new WsException('청중 권한이 없습니다.');
    }
  }
}

@Injectable()
export class WsAuthGuard extends WsBaseGuard {
  protected validateRole(room: Room, _participant: Participant) {
    if (room.status !== 'active') {
      throw new WsException('활성화된 강의가 아닙니다.');
    }
  }
}
