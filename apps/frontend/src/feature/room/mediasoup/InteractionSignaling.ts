import type {
  EndPollDetailPayload,
  EndPollPayload,
  StartPollPayload,
  UpdatePollStatusFullPayload,
  UpdatePollStatusSubPayload,
  UpdateGestureStatusPayload,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import type { MediaSocket } from '../types';

/**
 * 인터랙션 관련 소켓 리스너(투표/제스처) 설정 모듈
 */
export const InteractionSignaling = {
  /**
   * 인터랙션 이벤트 리스너 설정 (발표자)
   */
  setupPresenterHandlers: (
    socket: MediaSocket,
    actions: {
      handleUpdateGestureStatus: (data: UpdateGestureStatusPayload) => void;
      handleUpdatePollDetail: (data: UpdatePollStatusFullPayload) => void;
      handlePollEndDetail: (data: EndPollDetailPayload) => void;
    },
  ) => {
    socket.on('update_gesture_status', (data) => {
      logger.socket.info('제스처 상태 업데이트 수신', data);
      actions.handleUpdateGestureStatus(data);
    });

    socket.on('update_poll_detail', (data) => {
      logger.socket.info('투표 상세 업데이트 수신', data);
      actions.handleUpdatePollDetail(data);
    });

    socket.on('poll_end_detail', (data) => {
      logger.socket.info('투표 종료 상세 이벤트 수신', data);
      actions.handlePollEndDetail(data);
    });
  },

  /**
   * 인터랙션 이벤트 리스너 설정 (참여자)
   */
  setupAudienceHandlers: (
    socket: MediaSocket,
    actions: {
      handleUpdateGestureStatus: (data: UpdateGestureStatusPayload) => void;
      handleStartPoll: (data: StartPollPayload) => void;
      handleUpdatePoll: (data: UpdatePollStatusSubPayload) => void;
      handlePollEnd: (data: EndPollPayload) => void;
    },
  ) => {
    socket.on('update_gesture_status', (data) => {
      logger.socket.info('제스처 상태 업데이트 수신', data);
      actions.handleUpdateGestureStatus(data);
    });

    socket.on('start_poll', (data) => {
      logger.socket.info('투표 시작 이벤트 수신', data);
      actions.handleStartPoll(data);
    });

    socket.on('update_poll', (data) => {
      logger.socket.info('투표 상태 업데이트 수신', data);
      actions.handleUpdatePoll(data);
    });

    socket.on('poll_end', (data) => {
      logger.socket.info('투표 종료 이벤트 수신', data);
      actions.handlePollEnd(data);
    });
  },

  /**
   * 인터랙션 이벤트 리스너 해제
   */
  removeAllHandlers: (socket: MediaSocket) => {
    socket.off('update_gesture_status');
    socket.off('start_poll');
    socket.off('update_poll');
    socket.off('update_poll_detail');
    socket.off('poll_end');
    socket.off('poll_end_detail');
    logger.socket.info('[Interaction] 모든 인터랙션 리스너 해제 완료');
  },
};
