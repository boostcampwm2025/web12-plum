import { ChangeEvent, useRef } from 'react';
import { ALLOWED_FILE_EXTENSIONS_STRING } from '@plum/shared-interfaces';

import { useDragAndDrop } from '@/shared/hooks/useDragAndDrop';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';
import { AddFileResult } from '@/shared/hooks/usePresentation';
import { useToastStore } from '@/store/useToastStore';

interface PresentationUploaderProps {
  addFile: (file: File) => AddFileResult;
}

/**
 * 발표 자료 파일 업로드 컴포넌트
 */
export function PresentationUploader({ addFile }: PresentationUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore((state) => state.actions);

  // 파일 추가 및 결과 처리
  const handleAddFile = (file: File) => {
    const result = addFile(file);
    if (result.success) addToast({ type: 'success', title: '파일이 성공적으로 추가되었습니다.' });
    else addToast({ type: 'error', title: result.message });
  };

  // 드래그 앤 드롭
  const { isDragging, dragHandlers } = useDragAndDrop({ onFileDrop: handleAddFile });

  // 파일 선택 핸들러
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAddFile(file);
    e.target.value = '';
  };

  return (
    <div>
      <input
        id="file-upload"
        type="file"
        ref={inputRef}
        accept={ALLOWED_FILE_EXTENSIONS_STRING}
        onChange={handleFileSelect}
        aria-label="파일 업로드"
        className="hidden"
      />
      <button
        type="button"
        aria-label="파일 선택 또는 드래그하여 업로드"
        onClick={() => inputRef.current?.click()}
        {...dragHandlers}
        className={cn(
          'w-full cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/20'
            : 'hover:border-primary hover:bg-primary/20 border-gray-300',
        )}
      >
        <Icon
          name="upload"
          size={24}
          strokeWidth={2}
          className="text-subtext-light mx-auto"
          decorative
        />
        <p className="text-subtext-light mt-3 text-base font-bold">
          파일을 선택하거나 드래그하세요
        </p>
        <p className="text-subtext-light mt-2 text-xs font-normal">
          {ALLOWED_FILE_EXTENSIONS_STRING}
        </p>
      </button>
    </div>
  );
}
