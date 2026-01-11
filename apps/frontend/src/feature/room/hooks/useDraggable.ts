import { useRef, useState, useCallback } from 'react';

export function useDraggable() {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    element: HTMLElement | null;
    container: HTMLElement | null;
    startX: number;
    startY: number;
    elementStartX: number;
    elementStartY: number;
  } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current) return;

    const { startX, startY, elementStartX, elementStartY, element, container } =
      dragStateRef.current;

    if (!element || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const MARGIN = 32;

    const viewportX = elementStartX + (e.clientX - startX);
    const viewportY = elementStartY + (e.clientY - startY);

    const minX = containerRect.left;
    const minY = containerRect.top;
    const maxX = containerRect.right - elementRect.width - MARGIN;
    const maxY = containerRect.bottom - elementRect.height - MARGIN;

    const relativeX = Math.max(0, Math.min(viewportX - minX, maxX - minX));
    const relativeY = Math.max(0, Math.min(viewportY - minY, maxY - minY));

    element.style.left = `${relativeX}px`;
    element.style.top = `${relativeY}px`;
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
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

      const element = e.currentTarget;
      const container = element.parentElement;
      const rect = element.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();

      const initialLeft = rect.left;
      const initialTop = rect.top;

      element.style.position = 'absolute';
      element.style.left = `${initialLeft - (containerRect?.left || 0)}px`;
      element.style.top = `${initialTop - (containerRect?.top || 0)}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      dragStateRef.current = {
        element,
        container,
        startX: e.clientX,
        startY: e.clientY,
        elementStartX: initialLeft,
        elementStartY: initialTop,
      };

      setIsDragging(true);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
    },
  };
}
