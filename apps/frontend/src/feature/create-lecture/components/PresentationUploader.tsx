import { ChangeEvent, useRef } from 'react';
import { ALLOWED_FILE_EXTENSIONS_STRING } from '@plum/shared-interfaces';

import { useDragAndDrop } from '@/shared/hooks/useDragAndDrop';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';
import { useToastStore } from '@/shared/stores/useToastStore';
import { PresentationError } from '@/shared/hooks/usePresentation';

interface PresentationUploaderProps {
  addFile: (file: File) => void;
}

/**
 * 발표 자료 파일 업로드 컴포넌트
 *
 * 강의에서 사용할 파일을 직접 선택하거나 드래그 앤 드롭을 통해 업로드할 수 있는 영역 제공
 * 허용된 확장자 확인 및 업로드 과정에서의 에러를 핸들링하며 즉각적인 시각적 피드백 전달
 *
 * 1. `useRef`를 사용하여 숨겨진 브라우저 표준 파일 인풋(`input type="file"`)에 접근.
 * 2. 버튼 클릭 시 인풋의 `click()` 메서드를 트리거하여 파일 선택창을 실행하거나, 드래그 핸들러를 통해 파일 드롭을 감지.
 * 3. 선택된 파일이 존재할 경우 `handleAddFile` 함수를 통해 상위에서 전달받은 `addFile` 로직 수행.
 * 4. 작업 결과에 따라 성공 토스트를 띄우거나, `PresentationError`를 캡치하여 에러 메시지 노출.
 */
export function PresentationUploader({ addFile }: PresentationUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore((state) => state.actions);

  /**
   * 파일 추가 통합 핸들러
   * 파일 시스템에서 넘어온 객체를 최종적으로 폼 상태에 추가하고 토스트 피드백을 관리
   */
  const handleAddFile = (file: File) => {
    try {
      addFile(file);
      addToast({ type: 'success', title: '파일이 성공적으로 추가되었습니다.' });
    } catch (error) {
      if (error instanceof PresentationError) addToast({ type: 'error', title: error.message });
    }
  };

  // 드래그 앤 드롭
  const { isDragging, dragHandlers } = useDragAndDrop({ onFileDrop: handleAddFile });

  /**
   * 파일 선택 버튼 핸들러
   * 파일 인풋의 change 이벤트를 통해 선택된 파일을 처리
   */
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
