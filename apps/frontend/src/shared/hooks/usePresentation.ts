import {
  ALLOWED_FILE_EXTENSIONS_STRING,
  ALLOWED_FILE_MIME_TYPES,
  FILE_MAX_SIZE_BYTES,
  FILE_MAX_SIZE_MB,
} from '@plum/shared-interfaces';
import { ArrayPath, FieldArray, FieldValues, useFieldArray, useFormContext } from 'react-hook-form';

import { logger } from '@/shared/lib/logger';

type AllowedMimeType = (typeof ALLOWED_FILE_MIME_TYPES)[number];

/**
 * 파일 업로드 에러 메시지
 */
const ERROR_MESSAGES = {
  invalidMimeType: `${ALLOWED_FILE_EXTENSIONS_STRING} 파일만 업로드 가능합니다.`,
  tooLargeFile: `최대 ${FILE_MAX_SIZE_MB}MB까지 업로드 가능합니다.`,
  duplicateFile: '이미 동일한 파일이 업로드되어 있습니다.',
};

/**
 * 파일 MIME 타입이 허용되는지 확인하는 타입 가드 함수
 * @param type 파일 MIME 타입
 * @returns 타입 가드 결과
 */
const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType => {
  const isAllowed = (ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(mimeType);
  return isAllowed;
};

interface UsePresentationParams<T extends FieldValues> {
  filedName: ArrayPath<T>;
}

/**
 * 발표 자료 훅
 * - 파일 추가 및 삭제 기능
 * @returns 발표 자료 업로드 관련 함수 및 상태
 */
export function usePresentation<T extends FieldValues>({ filedName }: UsePresentationParams<T>) {
  const { control } = useFormContext<T>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: filedName,
  });

  /**
   * 파일 추가 함수
   * @param file 추가할 파일 객체
   */
  const addFile = ({ file, onError }: { file: File; onError?: (errorMessage: string) => void }) => {
    // 허용 MIME 타입 검사
    if (!isAllowedMimeType(file.type)) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.invalidMimeType);
      onError?.(ERROR_MESSAGES.invalidMimeType);
      return;
    }

    // 파일 크기 검사
    if (file.size > FILE_MAX_SIZE_BYTES) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.tooLargeFile);
      onError?.(ERROR_MESSAGES.tooLargeFile);
      return;
    }

    // 중복 검사
    const isDuplicate = fields.some((field) => {
      const typedField = field as unknown as File;
      return typedField.name === file.name && typedField.size === file.size;
    });

    if (isDuplicate) {
      logger.ui.error('[Presentation]', ERROR_MESSAGES.duplicateFile);
      onError?.(ERROR_MESSAGES.duplicateFile);
      return;
    }

    append(file as unknown as FieldArray<T, ArrayPath<T>>);
  };

  return {
    presentationFiles: fields,
    addFile,
    removeFile: remove,
  };
}
