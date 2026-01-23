import { useState, useEffect, RefObject } from 'react';

interface UseItemsPerPageConfig {
  buttonHeight: number;
  gap: number;
  itemHeight: number;
  fixedItemsCount?: number;
  maxItems?: number;
}

export function useItemsPerPage(
  containerRef: RefObject<HTMLDivElement>,
  config: UseItemsPerPageConfig,
) {
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (!containerRef.current) return;

      const containerHeight = containerRef.current.clientHeight;
      const { buttonHeight, gap, itemHeight, fixedItemsCount = 1, maxItems = 5 } = config;

      // 사용 가능한 높이 = 전체 높이 - 위 버튼 - 아래 버튼 - 고정 아이템들 - gap들
      const fixedHeight = buttonHeight * 2 + itemHeight * fixedItemsCount;
      const totalGaps = gap * (fixedItemsCount + 3);
      const availableHeight = containerHeight - fixedHeight - totalGaps;

      const calculatedItems = Math.floor((availableHeight + gap) / (itemHeight + gap));

      setItemsPerPage(Math.max(1, Math.min(calculatedItems, maxItems)));
    };

    calculateItemsPerPage();

    window.addEventListener('resize', calculateItemsPerPage);
    return () => window.removeEventListener('resize', calculateItemsPerPage);
  }, [containerRef, config]);

  return itemsPerPage;
}
