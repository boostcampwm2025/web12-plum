import { useRef } from 'react';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { useItemsPerPage } from '../hooks/useItemsPerPage';
import { useParticipantPagination } from '../hooks/useParticipantPagination';
import { useMediaStore } from '../stores/useMediaStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { MyInfo } from '../stores/useRoomStore';

interface ParticipantGridProps {
  videoMode: VideoDisplayMode;
  currentUser: MyInfo;
  onModeChange?: (mode: VideoDisplayMode) => void;
  onCurrentUserVideoElementChange?: (element: HTMLVideoElement | null) => void;
}

export function ParticipantGrid({
  videoMode,
  currentUser,
  onModeChange,
  onCurrentUserVideoElementChange,
}: ParticipantGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const localStream = useStreamStore((state) => state.localStream);

  const dynamicItemsPerPage = useItemsPerPage(containerRef, {
    buttonHeight: 24,
    gap: 12,
    itemHeight: 114,
    fixedItemsCount: 1,
  });

  const {
    currentPage,
    itemsPerPage,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
    sortedParticipants,
    visibleWindowParticipants,
  } = useParticipantPagination(dynamicItemsPerPage);

  if (videoMode !== 'side') return null;

  return (
    <aside className="bg-gray-700">
      <div
        ref={containerRef}
        className="ml-4 flex h-full flex-col gap-3"
      >
        <ParticipantVideo
          id={currentUser.id}
          name={currentUser.name}
          mode="side"
          isCurrentUser={true}
          onModeChange={onModeChange}
          stream={localStream}
          isCameraOn={isCameraOn}
          onVideoElementChange={onCurrentUserVideoElementChange}
        />

        {/* 이전 페이지 버튼 */}
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
          {visibleWindowParticipants.map((participant) => {
            const participantIdx = sortedParticipants.findIndex((p) => participant.id === p.id);
            const isCurrentlyVisible =
              participantIdx >= currentPage * itemsPerPage &&
              participantIdx < (currentPage + 1) * itemsPerPage;

            const videoProducerId = participant.producers.get('video');

            return (
              <ParticipantVideo
                key={participant.id}
                id={participant.id}
                name={participant.name}
                mode="side"
                videoProducerId={videoProducerId}
                participantRole={participant.role}
                isActive={true}
                isCurrentlyVisible={isCurrentlyVisible}
              />
            );
          })}
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
    </aside>
  );
}
