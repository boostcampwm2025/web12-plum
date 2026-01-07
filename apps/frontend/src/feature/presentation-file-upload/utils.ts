import {
  ALLOWED_FILE_EXTENSIONS_STRING,
  ALLOWED_FILE_MIME_TYPES,
  FILE_MAX_SIZE_BYTES,
  FILE_MAX_SIZE_MB,
} from '@/feature/presentation-file-upload/constants';

type AllowedMimeType = (typeof ALLOWED_FILE_MIME_TYPES)[number];

/**
 * 파일 업로드 에러 메시지
 */
const ERROR_MESSAGES = {
  invalidMimeType: `허용되지 않는 파일 형식입니다. ${ALLOWED_FILE_EXTENSIONS_STRING} 파일만 업로드 가능합니다.`,
  tooLargeFile: `파일 크기가 너무 큽니다. 최대 ${FILE_MAX_SIZE_MB}MB까지 업로드 가능합니다.`,
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

/**
 * 파일 유효성 검사 함수
 * @param file 업로드된 파일
 * @returns 에러 메시지 또는 null
 */
export const validateFileForUpload = (file: File): string | null => {
  if (!isAllowedMimeType(file.type)) {
    const errorMessage = ERROR_MESSAGES.invalidMimeType;
    return errorMessage;
  }

  if (file.size > FILE_MAX_SIZE_BYTES) {
    const errorMessage = ERROR_MESSAGES.tooLargeFile;
    return errorMessage;
  }

  return null;
};
