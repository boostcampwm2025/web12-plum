import { ChangeEvent, useRef } from 'react';

import { useDragAndDrop } from '@/shared/hooks/useDragAndDrop';
import { ALLOWED_FILE_EXTENSIONS_STRING } from '@/shared/constants/presentation';
import { Icon } from '@/shared/components/icon/Icon';
import { validateFileForUpload } from '@/shared/lib/presentation';
import { cn } from '@/shared/lib/utils';

interface LecturePresentationUploadProps {
  onFileSelect: (file: File) => void;
  onValidationError: (error: string) => void;
}

/**
 * 발표 자료 파일 업로드 컴포넌트
 * @param onFileSelect 파일이 선택되었을 때 호출될 콜백
 * @param onValidationError 유효성 검사 에러가 발생했을 때 호출될 콜백
 * @returns 발표 자료 업로드 JSX 요소
 */
export function LecturePresentationUpload({
  onFileSelect,
  onValidationError,
}: LecturePresentationUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 버튼 클릭 핸들러
  const handleButtonClick = () => inputRef.current?.click();

  // 파일 처리 함수
  const handleFileValidation = (file: File) => {
    const error = validateFileForUpload(file);
    if (error) onValidationError?.(error);
    else onFileSelect?.(file);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleFileValidation(file);
    e.target.value = '';
  };

  const { isDragging, dragHandlers } = useDragAndDrop({ onFileDrop: handleFileValidation });

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
        onClick={handleButtonClick}
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
