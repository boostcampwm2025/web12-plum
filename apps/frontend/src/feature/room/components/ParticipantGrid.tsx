import { useRef } from 'react';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { useItemsPerPage } from '../hooks/useItemsPerPage';
import { usePagination } from '../hooks/usePagination';
import { type Participant } from '../types';

interface ParticipantGridProps {
  currentUser: Participant;
  participants: Array<Participant>;
  onModeChange?: (mode: VideoDisplayMode) => void;
}

export function ParticipantGrid({ currentUser, participants, onModeChange }: ParticipantGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = useItemsPerPage(containerRef, {
    buttonHeight: 24,
    gap: 12,
    itemHeight: 114,
    fixedItemsCount: 1,
  });

  const {
    currentItems: currentParticipants,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
  } = usePagination(participants, itemsPerPage);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col gap-3"
    >
      <ParticipantVideo
        id={currentUser.id}
        name={currentUser.name}
        mode="side"
        isCurrentUser={true}
        onModeChange={onModeChange}
      />

      <Button
        onClick={goToPrevPage}
        disabled={!hasPrevPage}
        className="h-6 rounded-b-md bg-gray-400"
        aria-label="이전 참가자 보기"
      >
        <Icon
          name="chevron"
          size={24}
          className="rotate-180"
        />
      </Button>

      <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden">
        {currentParticipants.map((participant) => (
          <ParticipantVideo
            key={participant.id}
            id={participant.id}
            name={participant.name}
            mode="side"
          />
        ))}
      </div>

      <Button
        onClick={goToNextPage}
        disabled={!hasNextPage}
        className="h-6 rounded-b-md bg-gray-400"
        aria-label="다음 참가자 보기"
      >
        <Icon
          name="chevron"
          size={24}
        />
      </Button>
    </div>
  );
}
