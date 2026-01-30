import {
  ALLOWED_FILE_EXTENSIONS_STRING,
  FILE_MAX_SIZE_BYTES,
  FILE_MAX_SIZE_MB,
} from '@plum/shared-interfaces';
import { FieldValues, Path, PathValue, useFormContext, useWatch } from 'react-hook-form';

import { isAllowedMimeType } from '../lib/presentations';
import { logger } from '../lib/logger';

/**
 * 파일 업로드 에러 메시지
 */
const ERROR_MESSAGES = {
  invalidMimeType: `${ALLOWED_FILE_EXTENSIONS_STRING} 파일만 업로드 가능합니다.`,
  tooLargeFile: `최대 ${FILE_MAX_SIZE_MB}MB까지 업로드 가능합니다.`,
  duplicateFile: '이미 동일한 파일이 업로드되어 있습니다.',
  unknown: '파일 추가 중 오류가 발생했습니다.',
};

/**
 * 파일 업로드 에러 클래스
 */
export class PresentationError extends Error {
  type: keyof typeof ERROR_MESSAGES;

  constructor(type: keyof typeof ERROR_MESSAGES) {
    const message = ERROR_MESSAGES[type] ?? ERROR_MESSAGES.unknown;

    super(message);
    this.name = 'PresentationError';
    this.type = type;

    logger.ui.error('[Presentation]', message);
  }
}

interface UsePresentationParams<T extends FieldValues> {
  fieldName: Path<T>;
}

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
   */
  const addFile = (file: File) => {
    // 허용 MIME 타입 검사
    if (!isAllowedMimeType(file.type)) {
      throw new PresentationError('invalidMimeType');
    }

    // 파일 크기 검사
    if (file.size > FILE_MAX_SIZE_BYTES) {
      throw new PresentationError('tooLargeFile');
    }

    // 중복 검사
    const isDuplicate = presentationFiles.some(
      (existingFile) => existingFile.name === file.name && existingFile.size === file.size,
    );
    if (isDuplicate) {
      throw new PresentationError('duplicateFile');
    }

    setValue(fieldName, [...presentationFiles, file] as PathValue<T, Path<T>>);
  };

  /**
   * 파일 삭제 함수
   * @param index 삭제할 파일 인덱스
   */
  const removeFile = (index: number) => {
    setValue(fieldName, presentationFiles.filter((_, i) => i !== index) as PathValue<T, Path<T>>);
  };

  return { presentationFiles, addFile, removeFile };
}
