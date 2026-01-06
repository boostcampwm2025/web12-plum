import { ChangeEvent, ReactNode, useRef } from 'react';

import { ALLOWED_FILE_EXTENSIONS_STRING } from '@/feature/presentation-file-upload/constants/presentationFileUpload.constant';
import { useDragAndDrop } from '@/feature/presentation-file-upload/hooks/useDragAndDrop';
import { validateFileForUpload } from '@/feature/presentation-file-upload/utils/validateFileForUpload.util';

interface PresentationFileUploaderProps {
  className?: string;
  children: ReactNode;
  onFileSelect: (file: File) => void;
  onValidationError: (error: string) => void;
}

/**
 * 발표 자료 파일 업로드 컴포넌트
 * @param className 추가적인 CSS 클래스
 * @param children 버튼 내부에 렌더링될 요소
 * @param onFileSelect 파일이 선택되었을 때 호출될 콜백
 * @param onValidationError 유효성 검사 에러가 발생했을 때 호출될 콜백
 * @returns 발표 자료 업로드 JSX 요소
 */
export const PresentationFileUploader = ({
  className,
  children,
  onFileSelect,
  onValidationError,
}: PresentationFileUploaderProps) => {
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
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/20'
            : 'hover:border-primary hover:bg-primary/20 border-gray-300'
        } ${className}`}
      >
        {children}
      </button>
    </div>
  );
};
