import { useEffect } from 'react';
import type { NewProducerPayload, ParticipantRole } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

import { useRemoteMedia } from './useRemoteMedia';

interface UseParticipantVideoSubscriptionParams {
  id: string;
  name: string;
  isCurrentUser: boolean;
  videoProducerId?: string;
  participantRole?: ParticipantRole;
  isActive: boolean;
}

export function useParticipantVideoSubscription({
  id,
  name,
  isCurrentUser,
  videoProducerId,
  participantRole,
  isActive,
}: UseParticipantVideoSubscriptionParams) {
  const { consumeRemoteProducer, stopConsuming } = useRemoteMedia();

  useEffect(() => {
    if (isCurrentUser || !videoProducerId || !participantRole) return;

    if (isActive) {
      logger.ui.debug(`[Network] Consume 시작: ${name} (ID: ${id})`);
      const payload: NewProducerPayload = {
        participantId: id,
        producerId: videoProducerId,
        type: 'video',
        kind: 'video',
        participantRole,
      };
      void consumeRemoteProducer(payload).catch((error) => {
        logger.ui.warn(`[Network] Consume 실패: ${name} (ID: ${id})`, error);
      });
    } else {
      logger.ui.debug(`[Network] 수신 중단(InActive): ${name} (ID: ${id})`);
      stopConsuming(id, 'video');
    }

    return () => {
      if (videoProducerId) {
        logger.ui.debug(`[Network] 수신 중단(언마운트): ${name} (ID: ${id})`);
        stopConsuming(id, 'video');
      }
    };
  }, [
    isActive,
    id,
    name,
    videoProducerId,
    participantRole,
    isCurrentUser,
    consumeRemoteProducer,
    stopConsuming,
  ]);
}
