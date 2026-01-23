import { ChangeEvent, useRef } from 'react';
import { ALLOWED_FILE_EXTENSIONS_STRING, CreateRoomRequest } from '@plum/shared-interfaces';

import { useDragAndDrop } from '@/shared/hooks/useDragAndDrop';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';

import { useToastStore } from '@/store/useToastStore';
import { usePresentation } from '@/shared/hooks/usePresentation';
import { LECTURE_FORM_KEYS } from '../schema';

/**
 * 발표 자료 파일 업로드 컴포넌트
 */
export function PresentationUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const filedName = LECTURE_FORM_KEYS.presentationFiles;

  const { addToast } = useToastStore((state) => state.actions);
  const { addFile } = usePresentation<CreateRoomRequest>({ filedName });

  // 에러 처리 핸들러
  const handleError = (errorMessage: string) => {
    addToast({ type: 'error', title: errorMessage });
  };

  // 드래그 앤 드롭
  const { isDragging, dragHandlers } = useDragAndDrop({
    onFileDrop: (file) => addFile({ file, onError: handleError }),
  });

  // 파일 선택 핸들러
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addFile({ file, onError: handleError });
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
