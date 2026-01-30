import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRoomStore } from '../stores/useRoomStore';

const MAX_ITEMS = 5;

export function useParticipantPagination(dynamicItemsPerPage: number | null) {
  const [currentPage, setCurrentPage] = useState(0);
  const participantsMap = useRoomStore(useShallow((state) => state.participants));
  const participants = useMemo(() => Array.from(participantsMap.values()), [participantsMap]);

  // 아직 측정되지 않았으면 0으로 처리 (빈 윈도우)
  const itemsPerPage = dynamicItemsPerPage !== null ? Math.min(MAX_ITEMS, dynamicItemsPerPage) : 0;

  const totalPages = Math.ceil(participants.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = participants.slice(startIndex, endIndex);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;

  /**
   * 현재 페이지(P)를 기준으로 P-1, P, P+1 페이지의 참가자들만 렌더링
   */
  const visibleWindowParticipants = useMemo(() => {
    // 현재 페이지의 시작 인덱스
    const currentStart = currentPage * itemsPerPage;

    // 윈도우 시작: 이전 페이지의 시작점 (0보다 작을 수 없음)
    const windowStart = Math.max(0, currentStart - itemsPerPage);

    // 윈도우 끝: 다음 페이지의 끝점
    const windowEnd = currentStart + itemsPerPage * 2;

    return participants.slice(windowStart, windowEnd);
  }, [participants, currentPage, itemsPerPage]);

  return {
    currentPage,
    currentItems,
    itemsPerPage,
    totalPages,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
    participants,
    visibleWindowParticipants,
  };
}
