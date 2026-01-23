import {
  ALLOWED_FILE_EXTENSIONS_STRING,
  FILE_MAX_SIZE_BYTES,
  FILE_MAX_SIZE_MB,
} from '@plum/shared-interfaces';
import { FieldValues, Path, PathValue, useFormContext, useWatch } from 'react-hook-form';

import { logger } from '@/shared/lib/logger';

import { isAllowedMimeType } from '../lib/presentations';

/**
 * 파일 업로드 에러 메시지
 */
const ERROR_MESSAGES = {
  invalidMimeType: `${ALLOWED_FILE_EXTENSIONS_STRING} 파일만 업로드 가능합니다.`,
  tooLargeFile: `최대 ${FILE_MAX_SIZE_MB}MB까지 업로드 가능합니다.`,
  duplicateFile: '이미 동일한 파일이 업로드되어 있습니다.',
};

interface UsePresentationParams<T extends FieldValues> {
  fieldName: Path<T>;
}

/**
 * 파일 추가 결과 타입
 */
export type AddFileResult = { success: true } | { success: false; message: string };

/**
 * 발표 자료 훅
 * - 파일 추가 및 삭제 기능
 * @returns 발표 자료 업로드 관련 함수 및 상태
 */
export function usePresentation<T extends FieldValues>({ fieldName }: UsePresentationParams<T>) {
  const { setValue } = useFormContext<T>();
  const presentationFiles = (useWatch({ name: fieldName }) || []) as File[];

  /**
   * 파일 추가 함수
   * @param file 추가할 파일 객체
   * @returns 성공 시 { success: true }, 실패 시 { success: false, message: string }
   */
  const addFile = (file: File): AddFileResult => {
    // 허용 MIME 타입 검사
    if (!isAllowedMimeType(file.type)) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.invalidMimeType);
      return { success: false, message: ERROR_MESSAGES.invalidMimeType };
    }

    // 파일 크기 검사
    if (file.size > FILE_MAX_SIZE_BYTES) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.tooLargeFile);
      return { success: false, message: ERROR_MESSAGES.tooLargeFile };
    }

    // 중복 검사
    const isDuplicate = presentationFiles.some(
      (existingFile) => existingFile.name === file.name && existingFile.size === file.size,
    );

    if (isDuplicate) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.duplicateFile);
      return { success: false, message: ERROR_MESSAGES.duplicateFile };
    }

    setValue(fieldName, [...presentationFiles, file] as PathValue<T, Path<T>>);
    return { success: true };
  };

  /**
   * 파일 삭제 함수
   * @param index 삭제할 파일 인덱스
   */
  const removeFile = (index: number) => {
    setValue(fieldName, presentationFiles.filter((_, i) => i !== index) as PathValue<T, Path<T>>);
  };

  return {
    presentationFiles,
    addFile,
    removeFile,
  };
}
