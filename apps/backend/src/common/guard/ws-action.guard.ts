import { Injectable } from '@nestjs/common';
import { Participant, Room } from '@plum/shared-interfaces';

import { BusinessException } from '../types/index.js';
import { WsBaseGuard } from './ws-base.guard.js';

@Injectable()
export class WsPresenterGuard extends WsBaseGuard {
  protected validateRole(room: Room, participant: Participant) {
    if (participant.role !== 'presenter' || room.presenter !== participant.id) {
      throw new BusinessException('발표자 권한이 없습니다.');
    }
    if (room.status !== 'active') {
      throw new BusinessException('활성화된 강의가 아닙니다.');
    }
  }
}

@Injectable()
export class WsAudienceGuard extends WsBaseGuard {
  protected validateRole(room: Room, participant: Participant) {
    if (participant.role !== 'audience') {
      throw new BusinessException('청중 권한이 없습니다.');
    }
    if (room.status !== 'active') {
      throw new BusinessException('활성화된 강의가 아닙니다.');
    }
  }
}

@Injectable()
export class WsAuthGuard extends WsBaseGuard {
  protected validateRole(room: Room, _participant: Participant) {
    if (room.status !== 'active') {
      throw new BusinessException('활성화된 강의가 아닙니다.');
    }
  }
}
