import { useState, useLayoutEffect, type RefObject } from 'react';

type DropdownPosition = 'bottom' | 'top';

interface UseDropdownPositionOptions {
  triggerRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  offset?: number;
}

interface UseDropdownPositionReturn {
  position: DropdownPosition;
  positionStyles: {
    top?: string;
    bottom?: string;
    marginTop?: string;
    marginBottom?: string;
  };
}

/**
 * 드롭다운의 위치를 자동으로 계산하는 훅
 * 화면 하단에 공간이 부족하면 위에 표시
 *
 * @param options - 훅 옵션
 * @returns 드롭다운 위치와 스타일 객체
 */
export function useDropdownPosition({
  triggerRef,
  listRef,
  isOpen,
  offset = 8,
}: UseDropdownPositionOptions): UseDropdownPositionReturn {
  const [position, setPosition] = useState<DropdownPosition>('bottom');

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const calculatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const listHeight = listRef.current?.offsetHeight ?? 200;

      if (!triggerRect) return;

      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom - offset;
      const spaceAbove = triggerRect.top - offset;

      if (spaceBelow < listHeight && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    };

    calculatePosition();

    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, triggerRef, listRef, offset]);

  const positionStyles =
    position === 'bottom'
      ? { top: '100%', marginTop: '4px' }
      : { bottom: '100%', marginBottom: '4px' };

  return { position, positionStyles };
}
