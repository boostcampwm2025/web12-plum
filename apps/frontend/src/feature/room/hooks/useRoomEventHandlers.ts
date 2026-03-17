import { useCallback, useEffect } from 'react';

import { logger } from '@/shared/lib/logger';

import { useRoomStore } from '../stores/useRoomStore';
import { useAudienceEventHandlers } from './useAudienceEventHandlers';
import { useCommonEventHandlers } from './useCommonEventHandlers';
import { usePresenterEventHandlers } from './usePresenterEventHandlers';

/**
 * 실시간 이벤트 핸들러 오케스트레이터
 *
 * 역할별로 분리된 하위 훅을 조합하여 모든 Socket.IO 이벤트 핸들러를 등록
 *
 * - 공통 (Room/Media/Chat): useCommonEventHandlers
 * - Presenter 전용 (Poll/QnA/Interaction 상세): usePresenterEventHandlers
 * - Audience 전용 (Poll/QnA/Interaction 참여): useAudienceEventHandlers
 */
export function useRoomEventHandlers() {
  const myInfo = useRoomStore((state) => state.myInfo);
  const isPresenter = myInfo?.role === 'presenter';

  const { setupCommonHandlers, removeCommonHandlers } = useCommonEventHandlers();
  const { setupPresenterHandlers, removePresenterHandlers } = usePresenterEventHandlers();
  const { setupAudienceHandlers, removeAudienceHandlers } = useAudienceEventHandlers();

  /**
   * 모든 이벤트 핸들러 등록
   *
   * - 공통 핸들러 + 역할별 핸들러를 병렬로 등록
   */
  const setupAllHandlers = useCallback(() => {
    setupCommonHandlers();
    if (isPresenter) setupPresenterHandlers();
    else setupAudienceHandlers();
    logger.socket.debug(`[useRoomEventHandlers] 모든 (${myInfo?.role}) 핸들러 등록 완료`);
  }, [
    setupCommonHandlers,
    setupPresenterHandlers,
    setupAudienceHandlers,
    isPresenter,
    myInfo?.role,
  ]);

  /**
   * 컴포넌트 언마운트 시 모든 소켓 리스너 정리
   *
   * 정리하지 않으면 발생하는 문제:
   * - 메모리 누수 (이벤트 리스너가 계속 남아있음)
   * - 중복 핸들러 등록 (재입장 시 핸들러가 2번씩 호출됨)
   * - 잘못된 상태 업데이트 (이전 방의 이벤트가 현재 UI에 반영됨)
   */
  useEffect(() => {
    return () => {
      removeCommonHandlers();
      if (isPresenter) removePresenterHandlers();
      else removeAudienceHandlers();
      logger.socket.debug(`[useRoomEventHandlers] 모든 핸들러 정리 완료`);
    };
  }, [isPresenter, removeCommonHandlers, removePresenterHandlers, removeAudienceHandlers]);

  return { setupAllHandlers };
}
