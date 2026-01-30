import { ALLOWED_FILE_MIME_TYPES } from '@plum/shared-interfaces';

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 * @param bytes 파일 크기 (바이트)
 * @returns 포맷된 파일 크기 문자열 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;

  return formattedSize;
}

type AllowedMimeType = (typeof ALLOWED_FILE_MIME_TYPES)[number];

/**
 * 파일 MIME 타입이 허용되는지 확인하는 타입 가드 함수
 */
export const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType => {
  const isAllowed = (ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(mimeType);
  return isAllowed;
};
