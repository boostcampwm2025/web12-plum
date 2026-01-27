import { z } from 'zod';

/**
 * TODO: 최대 크기 논의하기
 * 발표 자료 최대 파일 크기: 50MB
 */
export const FILE_MAX_SIZE_MB = 50;
export const FILE_MAX_SIZE_BYTES = FILE_MAX_SIZE_MB * 1024 * 1024;

/**
 * 허용되는 파일 형식과 MIME 타입
 */
const FILE_FORMATS = [
  { accept: '.pdf', mime: 'application/pdf' },
  { accept: '.ppt', mime: 'application/vnd.ms-powerpoint' },
  {
    accept: '.pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
] as const;

/**
 * 허용되는 파일 형식
 */
export const ALLOWED_FILE_MIME_TYPES = FILE_FORMATS.map((type) => type.mime);

/**
 * 허용되는 파일 확장자 문자열
 */
export const ALLOWED_FILE_EXTENSIONS_STRING = FILE_FORMATS.map((type) => type.accept).join(', ');

export const fileSchema = z.custom<any>(
  (val) => {
    if (!val || typeof val !== 'object') return false;

    // 브라우저의 File 객체이거나, 서버의 Multer 객체인 특징이 있는지 확인
    // 브라우저: 'name' 속성 존재 / 서버: 'originalname' 속성 존재
    const isBrowserFile = 'name' in val && 'size' in val;
    const isServerFile = 'originalname' in val && 'size' in val;

    return isBrowserFile || isServerFile;
  },
  {
    message: '유효한 파일 형식이 아닙니다.',
  },
);

export interface FileInfo {
  url: string;
  size: number;
}
