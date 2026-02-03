import { useState, useLayoutEffect, type RefObject } from 'react';

type DropdownPosition = 'bottom' | 'top';

interface UseDropdownPositionOptions {
  triggerRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  offset?: number;
}

interface PositionStyles {
  position: 'fixed';
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

interface UseDropdownPositionReturn {
  position: DropdownPosition;
  positionStyles: PositionStyles;
}

/**
 * 드롭다운의 위치를 자동으로 계산하는 훅
 * 화면 하단에 공간이 부족하면 위에 표시
 * Portal 사용을 위해 viewport 기준 절대 좌표 반환
 *
 * @param options - 훅 옵션
 * @returns 드롭다운 위치와 스타일 객체
 */
export function useDropdownPosition({
  triggerRef,
  listRef,
  isOpen,
  offset = 4,
}: UseDropdownPositionOptions): UseDropdownPositionReturn {
  const [position, setPosition] = useState<DropdownPosition>('bottom');
  const [positionStyles, setPositionStyles] = useState<PositionStyles>({
    position: 'fixed',
    top: 0,
    left: 0,
    width: 0,
  });

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

      const newPosition = spaceBelow < listHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
      setPosition(newPosition);

      if (newPosition === 'bottom') {
        setPositionStyles({
          position: 'fixed',
          top: triggerRect.bottom + offset,
          left: triggerRect.left,
          width: triggerRect.width,
        });
      } else {
        setPositionStyles({
          position: 'fixed',
          bottom: viewportHeight - triggerRect.top + offset,
          left: triggerRect.left,
          width: triggerRect.width,
        });
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

  return { position, positionStyles };
}
