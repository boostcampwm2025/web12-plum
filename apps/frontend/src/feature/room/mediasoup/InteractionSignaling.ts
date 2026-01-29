import type {
  EndPollDetailPayload,
  EndPollPayload,
  StartPollPayload,
  UpdatePollStatusFullPayload,
  UpdatePollStatusSubPayload,
  UpdateGestureStatusPayload,
  StartQnaPayload,
  UpdateQnaFullPayload,
  UpdateQnaSubPayload,
  EndQnaPayload,
  EndQnaDetailPayload,
  ScoreUpdatePayload,
  RankUpdatePayload,
  PresenterScoreInfoPayload,
  ChatMessage,
} from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import type { MediaSocket } from '../types';

/**
 * 인터랙션 관련 소켓 리스너(투표/제스처/채팅) 설정 모듈
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
      handleUpdateQnaDetail: (data: UpdateQnaFullPayload) => void;
      handleQnaEndDetail: (data: EndQnaDetailPayload) => void;
      handlePresenterRankUpdate: (data: PresenterScoreInfoPayload) => void;
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

    socket.on('update_qna_detail', (data) => {
      logger.socket.info('QnA 상세 업데이트 수신', data);
      actions.handleUpdateQnaDetail(data);
    });

    socket.on('qna_end_detail', (data) => {
      logger.socket.info('QnA 종료 상세 이벤트 수신', data);
      actions.handleQnaEndDetail(data);
    });

    socket.on('presenter_rank_update', (data) => {
      logger.socket.info('발표자 랭킹 업데이트 수신', data);
      actions.handlePresenterRankUpdate(data);
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
      handleStartQna: (data: StartQnaPayload) => void;
      handleUpdateQna: (data: UpdateQnaSubPayload) => void;
      handleQnaEnd: (data: EndQnaPayload) => void;
      handleScoreUpdate: (data: ScoreUpdatePayload) => void;
      handleRankUpdate: (data: RankUpdatePayload) => void;
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

    socket.on('start_qna', (data) => {
      logger.socket.info('QnA 시작 이벤트 수신', data);
      actions.handleStartQna(data);
    });

    socket.on('update_qna', (data) => {
      logger.socket.info('QnA 상태 업데이트 수신', data);
      actions.handleUpdateQna(data);
    });

    socket.on('qna_end', (data) => {
      logger.socket.info('QnA 종료 이벤트 수신', data);
      actions.handleQnaEnd(data);
    });

    socket.on('score_update', (data) => {
      logger.socket.info('점수 업데이트 수신', data);
      actions.handleScoreUpdate(data);
    });

    socket.on('rank_update', (data) => {
      logger.socket.info('랭킹 업데이트 수신', data);
      actions.handleRankUpdate(data);
    });
  },

  /**
   * 채팅 이벤트 리스너 설정 (발표자/참여자 공통)
   */
  setupChatHandlers: (
    socket: MediaSocket,
    actions: {
      handleNewChat: (data: ChatMessage) => void;
    },
  ) => {
    socket.on('new_chat', (data) => {
      logger.socket.info('새 채팅 메시지 수신', data);
      actions.handleNewChat(data);
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
    socket.off('start_qna');
    socket.off('update_qna');
    socket.off('update_qna_detail');
    socket.off('qna_end');
    socket.off('qna_end_detail');
    socket.off('score_update');
    socket.off('rank_update');
    socket.off('presenter_rank_update');
    socket.off('new_chat');
    logger.socket.info('[Interaction] 모든 인터랙션 리스너 해제 완료');
  },
};
