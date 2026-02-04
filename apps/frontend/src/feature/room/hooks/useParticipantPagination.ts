import { useMemo, useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRoomStore, Participant } from '../stores/useRoomStore';

const MAX_ITEMS = 5;

/**
 * 참가자 정렬 함수
 *
 * 정렬 우선순위:
 * 1. 발표자(presenter)는 항상 맨 앞
 * 2. 발화자 순서 (speakerOrder에 있는 참가자들, 먼저 말한 순)
 * 3. 나머지는 입장 시간순 (joinedAt)
 */
function sortParticipants(participants: Participant[], speakerOrder: string[]): Participant[] {
  const presenter = participants.find((p) => p.role === 'presenter');
  const others = participants.filter((p) => p.role !== 'presenter');

  const sortedOthers = [...others].sort((a, b) => {
    // 1. 발화자 순서 (speakerOrder)
    const aIndex = speakerOrder.indexOf(a.id);
    const bIndex = speakerOrder.indexOf(b.id);

    // 둘 다 speakerOrder에 있으면 순서대로
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // 하나만 speakerOrder에 있으면 그 쪽이 우선
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // 2. 둘 다 speakerOrder에 없으면 입장 시간순
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  // TODO: presenter가 없을 때 중복 계산 방지, 이후 presenter가 없는 경우가 사라지면 제거 가능
  return presenter ? [presenter, ...sortedOthers] : sortedOthers;
}

export function useParticipantPagination(dynamicItemsPerPage: number | null) {
  const [currentPage, setCurrentPage] = useState(0);
  const participantsMap = useRoomStore(useShallow((state) => state.participants));
  const speakerOrder = useRoomStore(useShallow((state) => state.speakerOrder));

  // 정렬된 참가자 목록
  const participants = useMemo(() => {
    const allParticipants = Array.from(participantsMap.values());
    return sortParticipants(allParticipants, speakerOrder);
  }, [participantsMap, speakerOrder]);

  // 아직 측정되지 않았으면 0으로 처리 (빈 윈도우)
  const itemsPerPage =
    dynamicItemsPerPage !== null && dynamicItemsPerPage > 0
      ? Math.min(MAX_ITEMS, dynamicItemsPerPage)
      : 0;

  const totalPages = itemsPerPage > 0 ? Math.ceil(participants.length / itemsPerPage) : 0;
  const maxPage = Math.max(0, totalPages - 1);

  // 렌더 중 동기적으로 유효한 페이지 계산 (consume/stop 사이클 방지)
  const effectiveCurrentPage = Math.min(currentPage, maxPage);

  useEffect(() => {
    if (currentPage !== effectiveCurrentPage) {
      setCurrentPage(effectiveCurrentPage);
    }
  }, [currentPage, effectiveCurrentPage]);

  const startIndex = effectiveCurrentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = participants.slice(startIndex, endIndex);

  const goToPrevPage = () => {
    if (totalPages === 0) return;
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    if (totalPages === 0) return;
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const hasPrevPage = effectiveCurrentPage > 0;
  const hasNextPage = effectiveCurrentPage < totalPages - 1;

  /**
   * 현재 페이지(P)를 기준으로 P-1, P, P+1 페이지의 참가자들만 렌더링
   */
  const visibleWindowParticipants = useMemo(() => {
    // 현재 페이지의 시작 인덱스
    const currentStart = effectiveCurrentPage * itemsPerPage;

    // 윈도우 시작: 이전 페이지의 시작점 (0보다 작을 수 없음)
    const windowStart = Math.max(0, currentStart - itemsPerPage);

    // 윈도우 끝: 다음 페이지의 끝점
    const windowEnd = currentStart + itemsPerPage * 2;

    return participants.slice(windowStart, windowEnd);
  }, [participants, effectiveCurrentPage, itemsPerPage]);

  return {
    currentPage: effectiveCurrentPage,
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
