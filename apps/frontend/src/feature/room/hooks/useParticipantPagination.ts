import { useMemo, useState } from 'react';
import { useRoomStore } from '../stores/useRoomStore';

const MAX_ITEMS = 5;

export function useParticipantPagination(dynamicItemsPerPage: number) {
  const [currentPage, setCurrentPage] = useState(0);
  const { getParticipantList } = useRoomStore((state) => state.actions);

  const itemsPerPage = Math.min(MAX_ITEMS, dynamicItemsPerPage) || MAX_ITEMS;
  const participants = getParticipantList();

  /**
   * 비디오를 송출하는 참가자를 우선적으로 정렬
   */
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aHasVideo = a.producers.has('video');
      const bHasVideo = b.producers.has('video');

      if (aHasVideo && !bHasVideo) return -1;
      if (!aHasVideo && bHasVideo) return 1;
      return 0;
    });
  }, [participants]);

  const totalPages = Math.ceil(sortedParticipants.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedParticipants.slice(startIndex, endIndex);

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

    return sortedParticipants.slice(windowStart, windowEnd);
  }, [sortedParticipants, currentPage, itemsPerPage]);

  return {
    currentPage,
    currentItems,
    itemsPerPage,
    totalPages,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
    sortedParticipants,
    visibleWindowParticipants,
  };
}
