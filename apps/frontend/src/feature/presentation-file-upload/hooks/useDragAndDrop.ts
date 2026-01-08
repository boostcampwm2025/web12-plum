import { DragEvent, useState } from 'react';

interface UseDragAndDropProps {
  onFileDrop: (file: File) => void;
}

/**
 * 드래그 앤 드롭 기능을 제공하는 커스텀 훅
 * @param onFileDrop 파일이 드롭되었을 때 호출될 콜백
 * @returns 드래그 상태 및 이벤트 핸들러들
 */
export const useDragAndDrop = ({ onFileDrop }: UseDragAndDropProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) onFileDrop(file);
  };

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
};
