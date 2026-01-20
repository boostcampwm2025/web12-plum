import { useMemo, useRef } from 'react';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { useItemsPerPage } from '../hooks/useItemsPerPage';
import { usePagination } from '../hooks/usePagination';
import { useMediaStore } from '../stores/useMediaStore';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { Participant, useRoomStore } from '../stores/useRoomStore';

interface ParticipantGridProps {
  videoMode: VideoDisplayMode;
  currentUser: Participant;
  onModeChange?: (mode: VideoDisplayMode) => void;
}

export function ParticipantGrid({ videoMode, currentUser, onModeChange }: ParticipantGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const localStream = useStreamStore((state) => state.localStream);
  const { getParticipantList } = useRoomStore((state) => state.actions);
  const { getRemoteStreamsByParticipant } = useMediaStore((state) => state.actions);

  const participants = getParticipantList();

  // 카메라 켜진 참가자를 위로, 꺼진 참가자를 아래로 정렬
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aHasVideo = a.producers.has('video');
      const bHasVideo = b.producers.has('video');
      if (aHasVideo && !bHasVideo) return -1;
      if (!aHasVideo && bHasVideo) return 1;
      return 0;
    });
  }, [participants]);

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
  } = usePagination<Participant>(sortedParticipants, itemsPerPage);

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
          {currentParticipants.map((participant) => {
            const remoteStreams = getRemoteStreamsByParticipant(participant.id);
            const videoStream = remoteStreams.find((s) => s.type === 'video');
            const videoProducerId = participant.producers.get('video');

            return (
              <ParticipantVideo
                key={participant.id}
                id={participant.id}
                name={participant.name}
                mode="side"
                stream={videoStream?.stream}
                isCameraOn={!!videoStream}
                videoProducerId={videoProducerId}
                participantRole={participant.role}
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
