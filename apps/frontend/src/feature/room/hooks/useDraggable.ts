import { useRef, useCallback, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

const MARGIN = 16;
const SNAP_DURATION = 300;

interface DragState {
  element: HTMLElement;
  container: HTMLElement;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

export function useDraggable() {
  const dragStateRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current) return;

    const { startX, startY, elementStartX, elementStartY, element, minX, minY, maxX, maxY } =
      dragStateRef.current;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const viewportX = elementStartX + (e.clientX - startX);
      const viewportY = elementStartY + (e.clientY - startY);

      const relativeX = Math.max(MARGIN, Math.min(viewportX - minX, maxX - minX));
      const relativeY = Math.max(MARGIN, Math.min(viewportY - minY, maxY - minY));

      element.style.left = `${relativeX}px`;
      element.style.top = `${relativeY}px`;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (dragStateRef.current) {
      const { element, container, maxX, maxY, minX, minY } = dragStateRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const isLeft =
        elementRect.left + elementRect.width / 2 < containerRect.left + containerRect.width / 2;
      const isTop =
        elementRect.top + elementRect.height / 2 < containerRect.top + containerRect.height / 2;

      const targetLeft = isLeft ? MARGIN : maxX - minX;
      const targetTop = isTop ? MARGIN : maxY - minY;

      element.style.transition = `all ${SNAP_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      element.style.left = `${targetLeft}px`;
      element.style.top = `${targetTop}px`;

      setTimeout(() => {
        if (!dragStateRef.current) {
          element.style.transition = 'none';
          if (!isLeft) {
            element.style.left = 'auto';
            element.style.right = `${MARGIN}px`;
          }
          if (!isTop) {
            element.style.top = 'auto';
            element.style.bottom = `${MARGIN}px`;
          }
        }
      }, SNAP_DURATION);
    }

    dragStateRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      e.stopPropagation();

      const element = e.currentTarget;
      const container = element.parentElement;
      if (!container) return;

      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      element.style.transition = 'none';

      element.style.position = 'absolute';
      element.style.left = `${rect.left - containerRect.left}px`;
      element.style.top = `${rect.top - containerRect.top}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      dragStateRef.current = {
        element,
        container,
        startX: e.clientX,
        startY: e.clientY,
        elementStartX: rect.left,
        elementStartY: rect.top,
        minX: containerRect.left,
        minY: containerRect.top,
        maxX: containerRect.right - rect.width - MARGIN,
        maxY: containerRect.bottom - rect.height - MARGIN,
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    handlers: {
      onMouseDown: handleMouseDown,
    },
  };
}
