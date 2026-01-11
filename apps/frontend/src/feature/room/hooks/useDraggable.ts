import { useRef, useCallback, useEffect } from 'react';

const MARGIN = 16;

export function useDraggable() {
  const dragStateRef = useRef<{
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
  } | null>(null);
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
    dragStateRef.current = null;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const element = e.currentTarget as HTMLElement;
      const container = element.parentElement;
      if (!container) return;

      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      element.style.position = 'absolute';
      element.style.left = `${rect.left - containerRect.left}px`;
      element.style.top = `${rect.top - containerRect.top}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      const minX = containerRect.left;
      const minY = containerRect.top;
      const maxX = containerRect.right - rect.width - MARGIN;
      const maxY = containerRect.bottom - rect.height - MARGIN;

      dragStateRef.current = {
        element,
        container,
        startX: e.clientX,
        startY: e.clientY,
        elementStartX: rect.left,
        elementStartY: rect.top,
        minX,
        minY,
        maxX,
        maxY,
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
